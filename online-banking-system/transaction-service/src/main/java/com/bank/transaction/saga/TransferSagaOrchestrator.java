package com.bank.transaction.saga;

import com.bank.common.dto.events.TransferCompletedEvent;
import com.bank.common.dto.events.TransferFailedEvent;
import com.bank.common.dto.events.TransferInitiatedEvent;
import com.bank.common.dto.events.TransferReversedEvent;
import com.bank.common.dto.request.TransferRequest;
import com.bank.common.dto.response.AccountResponse;
import com.bank.common.exceptions.CurrencyMismatchException;
import com.bank.common.exceptions.InsufficientFundsException;
import com.bank.common.exceptions.TransferBlockedException;
import com.bank.common.kafka.KafkaTopics;
import com.bank.transaction.client.AccountServiceClient;
import com.bank.transaction.entity.FraudRecord;
import com.bank.transaction.entity.ProcessedEvent;
import com.bank.transaction.entity.Transaction;
import com.bank.transaction.repository.FraudRecordRepository;
import com.bank.transaction.repository.ProcessedEventRepository;
import com.bank.transaction.repository.TransactionRepository;
import com.bank.transaction.service.AuditService;
import com.bank.transaction.service.FraudRuleEngine;
import com.bank.transaction.service.IdempotencyClaimService;
import com.bank.transaction.service.OutboxService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Orchestration-style Saga (one service owns the state machine) rather than choreography —
 * simpler to reason about and demo for a project at this scale.
 *
 * State machine:
 *   INITIATED -> RESERVED -> COMPLETED
 *                    \-> COMPENSATED (credit step failed; debit is refunded)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TransferSagaOrchestrator {

    private final TransactionRepository txnRepo;
    private final OutboxService outboxService;
    private final AccountServiceClient accountClient;
    private final FraudRuleEngine fraudRuleEngine;
    private final AuditService auditService;
    private final FraudRecordRepository fraudRecordRepo;
    private final ProcessedEventRepository processedEventRepo;
    private final IdempotencyClaimService idempotencyClaimService;
    private final ObjectMapper objectMapper;

    @Transactional
    public Transaction initiateTransfer(TransferRequest req) {
        // Step 1: Atomic idempotency claim in an isolated transaction boundary (REQUIRES_NEW)
        IdempotencyClaimService.ClaimResult claim = idempotencyClaimService.claimOrGet(req);
        Transaction txn = claim.transaction();

        if (!claim.isNewClaim()) {
            log.info("Idempotent replay or concurrent duplicate for key {}, returning transaction {}",
                    req.idempotencyKey(), txn.getId());
            return txn;
        }

        auditService.record(txn.getId(), "TRANSFER_INITIATED", req);

        // Step 2: Validate account existence and currency match
        AccountResponse fromAccount = accountClient.getAccount(req.fromAccountId());
        AccountResponse toAccount = accountClient.getAccount(req.toAccountId());

        if (fromAccount != null && toAccount != null) {
            String srcCurrency = fromAccount.currency() != null ? fromAccount.currency() : "USD";
            String tgtCurrency = toAccount.currency() != null ? toAccount.currency() : "USD";

            if (!srcCurrency.equalsIgnoreCase(tgtCurrency)) {
                txn.setStatus("FAILED");
                txn.setCurrency(srcCurrency);
                txn.setFailureReason("Cross-currency transfers are not supported without FX conversion (Source: " + srcCurrency + ", Destination: " + tgtCurrency + ")");
                txnRepo.save(txn);
                auditService.record(txn.getId(), "TRANSFER_FAILED", txn.getFailureReason());
                throw new CurrencyMismatchException(srcCurrency, tgtCurrency);
            }
            txn.setCurrency(srcCurrency);
        }

        // Step 3: Fraud / limit check before touching money
        FraudRuleEngine.FraudCheckResult check = fraudRuleEngine.evaluate(req.fromAccountId(), req.amount());
        if ("BLOCKED".equals(check.status())) {
            txn.setStatus("FAILED");
            txn.setRiskFlag("BLOCKED");
            txn.setFailureReason(check.reason());
            txnRepo.save(txn);

            FraudRecord fr = new FraudRecord();
            fr.setTransactionId(txn.getId());
            fr.setFromAccountId(req.fromAccountId());
            fr.setAmount(req.amount());
            fr.setRiskLevel("BLOCKED");
            fr.setRiskReason(check.reason());
            fr.setStatus("REJECTED");
            fraudRecordRepo.save(fr);

            auditService.record(txn.getId(), "TRANSFER_BLOCKED_FRAUD", check.reason());
            throw new TransferBlockedException(check.reason());
        }
        if ("REVIEW".equals(check.status())) {
            txn.setRiskFlag("REVIEW");
            FraudRecord fr = new FraudRecord();
            fr.setTransactionId(txn.getId());
            fr.setFromAccountId(req.fromAccountId());
            fr.setAmount(req.amount());
            fr.setRiskLevel("REVIEW");
            fr.setRiskReason(check.reason());
            fr.setStatus("PENDING");
            fraudRecordRepo.save(fr);
        }

        // Step 4: reserve funds (synchronous debit on source account)
        try {
            accountClient.debit(req.fromAccountId(), req.amount());
            txn.setStatus("RESERVED");
            txnRepo.save(txn);
            auditService.record(txn.getId(), "DEBIT_OK", null);
        } catch (InsufficientFundsException e) {
            txn.setStatus("FAILED");
            txn.setFailureReason(e.getMessage());
            txnRepo.save(txn);
            auditService.record(txn.getId(), "TRANSFER_FAILED", e.getMessage());
            throw e;
        }

        // Step 5: enqueue credit step via transactional outbox
        TransferInitiatedEvent event = new TransferInitiatedEvent(
                txn.getId(), req.idempotencyKey(), req.fromAccountId(), req.toAccountId(), req.amount(), txn.getCurrency());
        outboxService.enqueue(txn.getId(), "TRANSFER_INITIATED", KafkaTopics.TRANSFER_INITIATED, event);

        return txn;
    }

    @KafkaListener(topics = KafkaTopics.TRANSFER_INITIATED, groupId = "transaction-service-saga")
    @Transactional
    public void handleCreditStep(String rawJson) throws Exception {
        TransferInitiatedEvent event = objectMapper.readValue(rawJson, TransferInitiatedEvent.class);

        String eventKey = event.transactionId().toString() + ":CREDIT_STEP";
        if (processedEventRepo.existsByEventIdAndConsumerGroup(eventKey, "transaction-service-saga")) {
            log.info("Event {} already processed by transaction-service-saga. Skipping.", eventKey);
            return;
        }

        Transaction txn = txnRepo.findById(event.transactionId()).orElseThrow();

        if (!"RESERVED".equals(txn.getStatus())) {
            log.info("Skipping credit step for transaction {} — status is already {}", txn.getId(), txn.getStatus());
            processedEventRepo.save(new ProcessedEvent(eventKey, "transaction-service-saga", Instant.now()));
            return;
        }

        try {
            accountClient.credit(event.toAccountId(), event.amount());
            txn.setStatus("COMPLETED");
            txnRepo.save(txn);
            auditService.record(txn.getId(), "CREDIT_OK", null);
            outboxService.enqueue(txn.getId(), "TRANSFER_COMPLETED", KafkaTopics.TRANSFER_COMPLETED,
                    new TransferCompletedEvent(txn.getId()));
        } catch (Exception e) {
            // COMPENSATE: refund source account
            log.error("Credit step failed for transaction {}, compensating: {}", txn.getId(), e.getMessage());
            accountClient.credit(event.fromAccountId(), event.amount()); // refund
            txn.setStatus("COMPENSATED");
            txn.setFailureReason(e.getMessage());
            txnRepo.save(txn);
            auditService.record(txn.getId(), "TRANSFER_COMPENSATED", e.getMessage());
            outboxService.enqueue(txn.getId(), "TRANSFER_FAILED", KafkaTopics.TRANSFER_FAILED,
                    new TransferFailedEvent(txn.getId(), e.getMessage()));
        }

        processedEventRepo.save(new ProcessedEvent(eventKey, "transaction-service-saga", Instant.now()));
    }

    /**
     * Paired double-entry transfer reversal.
     */
    @Transactional
    public Transaction reverseTransfer(UUID transactionId, String reason) {
        Transaction txn = txnRepo.findById(transactionId)
                .orElseThrow(() -> new com.bank.common.exceptions.TransactionNotFoundException(transactionId));

        if ("REVERSED".equals(txn.getStatus())) {
            throw new IllegalStateException("Transaction is already reversed");
        }
        if (!"COMPLETED".equals(txn.getStatus())) {
            throw new IllegalStateException("Only COMPLETED transactions can be reversed. Current status: " + txn.getStatus());
        }

        // Perform compensating double-entry transfer: debit destination, credit source
        accountClient.reverseTransfer(txn.getToAccountId(), txn.getFromAccountId(), txn.getAmount(), txn.getId().toString());

        txn.setStatus("REVERSED");
        txn.setFailureReason(reason != null ? reason : "Reversed by user/admin");
        Transaction saved = txnRepo.save(txn);

        auditService.record(txn.getId(), "TRANSFER_REVERSED", reason != null ? reason : "Compensating double-entry reversal");

        TransferReversedEvent revEvent = new TransferReversedEvent(
                txn.getId(), txn.getFromAccountId(), txn.getToAccountId(), txn.getAmount(), reason, txn.getCurrency());
        outboxService.enqueue(txn.getId(), "TRANSFER_REVERSED", KafkaTopics.TRANSFER_REVERSED, revEvent);

        return saved;
    }
}
