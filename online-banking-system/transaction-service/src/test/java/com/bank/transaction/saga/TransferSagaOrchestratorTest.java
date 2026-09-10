package com.bank.transaction.saga;

import com.bank.common.dto.request.TransferRequest;
import com.bank.common.dto.response.AccountResponse;
import com.bank.common.exceptions.CurrencyMismatchException;
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
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

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

        // Default mock for account lookups: both are USD
        when(accountClient.getAccount(fromId)).thenReturn(new AccountResponse(
                fromId, UUID.randomUUID(), "ACC-FROM", "CHECKING", new BigDecimal("5000.00"), "ACTIVE", Instant.now(), "USD"));
        when(accountClient.getAccount(toId)).thenReturn(new AccountResponse(
                toId, UUID.randomUUID(), "ACC-TO", "SAVINGS", new BigDecimal("1000.00"), "ACTIVE", Instant.now(), "USD"));

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
        existing.setCurrency("USD");
        when(txnRepo.findByIdempotencyKey(key)).thenReturn(Optional.of(existing));

        Transaction result = orchestrator.initiateTransfer(
                new TransferRequest(fromId, toId, amount, key));

        assertThat(result).isSameAs(existing);
        verify(accountClient, never()).debit(any(), any());
        verify(txnRepo, never()).save(any());
    }

    @Test
    void crossCurrencyTransferIsStrictlyRejected() {
        when(txnRepo.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
        when(accountClient.getAccount(fromId)).thenReturn(new AccountResponse(
                fromId, UUID.randomUUID(), "ACC-INR", "CHECKING", new BigDecimal("50000.00"), "ACTIVE", Instant.now(), "INR"));
        when(accountClient.getAccount(toId)).thenReturn(new AccountResponse(
                toId, UUID.randomUUID(), "ACC-USD", "SAVINGS", new BigDecimal("1000.00"), "ACTIVE", Instant.now(), "USD"));

        assertThatThrownBy(() -> orchestrator.initiateTransfer(
                new TransferRequest(fromId, toId, amount, "idem-cross-1")))
                .isInstanceOf(CurrencyMismatchException.class);

        verify(accountClient, never()).debit(any(), any());
    }

    @Test
    void sameCurrencyINRTransferSucceeds() {
        when(txnRepo.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
        when(accountClient.getAccount(fromId)).thenReturn(new AccountResponse(
                fromId, UUID.randomUUID(), "ACC-INR-1", "CHECKING", new BigDecimal("50000.00"), "ACTIVE", Instant.now(), "INR"));
        when(accountClient.getAccount(toId)).thenReturn(new AccountResponse(
                toId, UUID.randomUUID(), "ACC-INR-2", "SAVINGS", new BigDecimal("1000.00"), "ACTIVE", Instant.now(), "INR"));
        when(fraudRuleEngine.evaluate(fromId, amount)).thenReturn(FraudCheckResult.ok());

        Transaction result = orchestrator.initiateTransfer(
                new TransferRequest(fromId, toId, amount, "idem-inr-ok"));

        assertThat(result.getStatus()).isEqualTo("RESERVED");
        assertThat(result.getCurrency()).isEqualTo("INR");
        verify(accountClient).debit(fromId, amount);
        verify(outboxService).enqueue(eq(result.getId()), eq("TRANSFER_INITIATED"), any(), any());
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

        verify(accountClient, never()).debit(any(), any());
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

        verifyNoInteractions(outboxService);
    }

    @Test
    void reversalPerformsDoubleEntryCompensationAndEmitsReversedEvent() {
        UUID txnId = UUID.randomUUID();
        Transaction completedTxn = new Transaction();
        completedTxn.setId(txnId);
        completedTxn.setFromAccountId(fromId);
        completedTxn.setToAccountId(toId);
        completedTxn.setAmount(amount);
        completedTxn.setCurrency("INR");
        completedTxn.setStatus("COMPLETED");

        when(txnRepo.findById(txnId)).thenReturn(Optional.of(completedTxn));
        when(txnRepo.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction reversed = orchestrator.reverseTransfer(txnId, "Customer dispute");

        assertThat(reversed.getStatus()).isEqualTo("REVERSED");
        assertThat(reversed.getCurrency()).isEqualTo("INR");
        verify(accountClient).reverseTransfer(toId, fromId, amount, txnId.toString());
        verify(outboxService).enqueue(eq(txnId), eq("TRANSFER_REVERSED"), any(), any());
        verify(auditService).record(eq(txnId), eq("TRANSFER_REVERSED"), any());
    }
}
