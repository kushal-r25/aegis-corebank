package com.bank.transaction.saga;

import com.bank.common.dto.request.TransferRequest;
import com.bank.common.exceptions.InsufficientFundsException;
import com.bank.common.exceptions.TransferBlockedException;
import com.bank.transaction.client.AccountServiceClient;
import com.bank.transaction.entity.Transaction;
import com.bank.transaction.repository.TransactionRepository;
import com.bank.transaction.service.AuditService;
import com.bank.transaction.service.FraudRuleEngine;
import com.bank.transaction.service.FraudRuleEngine.FraudCheckResult;
import com.bank.transaction.service.OutboxService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit-level tests for the saga's decision logic, with AccountServiceClient / repos
 * mocked out. Full end-to-end correctness (locking, actual DB writes) is covered by
 * AccountConcurrencyTest in account-service; this class targets the saga's branching:
 * idempotent replay, fraud blocking, and debit failure short-circuiting.
 */
class TransferSagaOrchestratorTest {

    @Mock private TransactionRepository txnRepo;
    @Mock private OutboxService outboxService;
    @Mock private AccountServiceClient accountClient;
    @Mock private FraudRuleEngine fraudRuleEngine;
    @Mock private AuditService auditService;
    @Mock private com.bank.transaction.repository.FraudRecordRepository fraudRecordRepo;
    @Mock private com.bank.transaction.repository.ProcessedEventRepository processedEventRepo;

    private TransferSagaOrchestrator orchestrator;

    private final UUID fromId = UUID.randomUUID();
    private final UUID toId = UUID.randomUUID();
    private final BigDecimal amount = new BigDecimal("500.00");

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(txnRepo.save(any(Transaction.class))).thenAnswer(inv -> {
            Transaction t = inv.getArgument(0);
            if (t.getId() == null) t.setId(UUID.randomUUID());
            return t;
        });
        when(txnRepo.saveAndFlush(any(Transaction.class))).thenAnswer(inv -> {
            Transaction t = inv.getArgument(0);
            if (t.getId() == null) t.setId(UUID.randomUUID());
            return t;
        });
        var claimService = new com.bank.transaction.service.IdempotencyClaimService(txnRepo);
        orchestrator = new TransferSagaOrchestrator(
                txnRepo, outboxService, accountClient, fraudRuleEngine, auditService,
                fraudRecordRepo, processedEventRepo, claimService, new ObjectMapper());
    }

    @Test
    void idempotentReplayReturnsExistingTransactionWithoutTouchingAccounts() {
        String key = "idem-key-1";
        Transaction existing = new Transaction();
        existing.setId(UUID.randomUUID());
        existing.setIdempotencyKey(key);
        existing.setStatus("COMPLETED");
        when(txnRepo.findByIdempotencyKey(key)).thenReturn(Optional.of(existing));

        Transaction result = orchestrator.initiateTransfer(
                new TransferRequest(fromId, toId, amount, key));

        assertThat(result).isSameAs(existing);
        verifyNoInteractions(accountClient); // no second debit on retry
        verify(txnRepo, never()).save(any());
    }

    @Test
    void blockedByFraudRuleNeverTouchesAccounts() {
        when(txnRepo.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
        when(txnRepo.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(fraudRuleEngine.evaluate(fromId, amount))
                .thenReturn(FraudCheckResult.blocked("Exceeds daily limit"));

        assertThatThrownBy(() -> orchestrator.initiateTransfer(
                new TransferRequest(fromId, toId, amount, "idem-key-2")))
                .isInstanceOf(TransferBlockedException.class);

        verifyNoInteractions(accountClient); // fraud check happens before any money moves
    }

    @Test
    void debitFailureMarksTransactionFailedAndNeverEnqueuesCreditStep() {
        when(txnRepo.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
        when(txnRepo.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(fraudRuleEngine.evaluate(fromId, amount)).thenReturn(FraudCheckResult.ok());
        doThrow(new InsufficientFundsException(fromId)).when(accountClient).debit(fromId, amount);

        assertThatThrownBy(() -> orchestrator.initiateTransfer(
                new TransferRequest(fromId, toId, amount, "idem-key-3")))
                .isInstanceOf(InsufficientFundsException.class);

        verifyNoInteractions(outboxService); // credit step must never be enqueued
    }

    @Test
    void reversalPerformsDoubleEntryCompensationAndEmitsReversedEvent() {
        UUID txnId = UUID.randomUUID();
        Transaction completedTxn = new Transaction();
        completedTxn.setId(txnId);
        completedTxn.setFromAccountId(fromId);
        completedTxn.setToAccountId(toId);
        completedTxn.setAmount(amount);
        completedTxn.setStatus("COMPLETED");

        when(txnRepo.findById(txnId)).thenReturn(Optional.of(completedTxn));
        when(txnRepo.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction reversed = orchestrator.reverseTransfer(txnId, "Customer dispute");

        assertThat(reversed.getStatus()).isEqualTo("REVERSED");
        verify(accountClient).reverseTransfer(toId, fromId, amount, txnId.toString());
        verify(outboxService).enqueue(eq(txnId), eq("TRANSFER_REVERSED"), any(), any());
        verify(auditService).record(eq(txnId), eq("TRANSFER_REVERSED"), any());
    }

    @Test
    void reversingAlreadyReversedTransactionThrowsIllegalStateException() {
        UUID txnId = UUID.randomUUID();
        Transaction reversedTxn = new Transaction();
        reversedTxn.setId(txnId);
        reversedTxn.setStatus("REVERSED");
        when(txnRepo.findById(txnId)).thenReturn(Optional.of(reversedTxn));

        assertThatThrownBy(() -> orchestrator.reverseTransfer(txnId, "Duplicate attempt"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already reversed");

        verifyNoInteractions(accountClient);
    }

    @Test
    void reversingNonCompletedTransactionThrowsIllegalStateException() {
        UUID txnId = UUID.randomUUID();
        Transaction pendingTxn = new Transaction();
        pendingTxn.setId(txnId);
        pendingTxn.setStatus("INITIATED");
        when(txnRepo.findById(txnId)).thenReturn(Optional.of(pendingTxn));

        assertThatThrownBy(() -> orchestrator.reverseTransfer(txnId, "Premature reversal"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Only COMPLETED transactions can be reversed");

        verifyNoInteractions(accountClient);
    }

    @Test
    void concurrentIdempotencyRaceHandlesConstraintViolationGracefully() {
        String key = "idem-race-key";
        when(txnRepo.findByIdempotencyKey(key)).thenReturn(Optional.empty());

        Transaction winner = new Transaction();
        winner.setId(UUID.randomUUID());
        winner.setIdempotencyKey(key);
        winner.setStatus("RESERVED");

        when(txnRepo.saveAndFlush(any(Transaction.class)))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate key"));
        when(txnRepo.findByIdempotencyKey(key)).thenReturn(Optional.of(winner));

        Transaction result = orchestrator.initiateTransfer(
                new TransferRequest(fromId, toId, amount, key));

        assertThat(result).isSameAs(winner);
        verifyNoInteractions(accountClient);
    }
}
