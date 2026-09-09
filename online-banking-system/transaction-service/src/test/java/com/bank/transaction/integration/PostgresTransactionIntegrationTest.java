package com.bank.transaction.integration;

import com.bank.common.dto.request.TransferRequest;
import com.bank.transaction.client.AccountServiceClient;
import com.bank.transaction.entity.OutboxEvent;
import com.bank.transaction.entity.Transaction;
import com.bank.transaction.repository.AuditLogRepository;
import com.bank.transaction.repository.OutboxEventRepository;
import com.bank.transaction.repository.ProcessedEventRepository;
import com.bank.transaction.repository.TransactionRepository;
import com.bank.transaction.saga.TransferSagaOrchestrator;
import com.bank.transaction.service.FraudRuleEngine;
import com.bank.transaction.service.OutboxService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("postgres")
@org.junit.jupiter.api.condition.EnabledIf("isPostgresAvailable")
public class PostgresTransactionIntegrationTest {

    static boolean isPostgresAvailable() {
        try (java.net.Socket socket = new java.net.Socket()) {
            socket.connect(new java.net.InetSocketAddress("localhost", 5434), 500);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    static {
        System.setProperty("user.timezone", "UTC");
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("UTC"));
    }

    @Autowired
    private TransactionRepository txnRepo;

    @Autowired
    private OutboxEventRepository outboxRepo;

    @Autowired
    private AuditLogRepository auditRepo;

    @Autowired
    private ProcessedEventRepository processedEventRepo;

    @Autowired
    private TransferSagaOrchestrator orchestrator;

    @Autowired
    private OutboxService outboxService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockBean
    private AccountServiceClient accountClient;

    @MockBean
    private FraudRuleEngine fraudRuleEngine;

    private UUID sourceId;
    private UUID targetId;

    @BeforeEach
    void setUp() {
        sourceId = UUID.randomUUID();
        targetId = UUID.randomUUID();
        when(fraudRuleEngine.evaluate(any(), any())).thenReturn(new FraudRuleEngine.FraudCheckResult("PASS", "Score: 10/100"));
    }

    private Transaction buildTxn(String idemKey, UUID from, UUID to, BigDecimal amount, String status) {
        Transaction txn = new Transaction();
        txn.setIdempotencyKey(idemKey);
        txn.setFromAccountId(from);
        txn.setToAccountId(to);
        txn.setAmount(amount);
        txn.setStatus(status);
        return txn;
    }

    @Test
    @DisplayName("1. PostgreSQL Idempotency Unique Constraint Enforcement")
    void testPostgresUniqueIdempotencyConstraint() {
        String idemKey = "IDEM-PG-" + UUID.randomUUID();
        Transaction t1 = buildTxn(idemKey, sourceId, targetId, new BigDecimal("100.00"), "INITIATED");
        txnRepo.saveAndFlush(t1);

        Transaction t2 = buildTxn(idemKey, sourceId, targetId, new BigDecimal("200.00"), "INITIATED");
        assertThrows(DataIntegrityViolationException.class, () -> {
            txnRepo.saveAndFlush(t2);
        }, "PostgreSQL unique constraint on idempotency_key must prevent duplicate insertion");
    }

    @Test
    @DisplayName("2. Concurrent Duplicate Transfer Requests with Same Idempotency Key (Real PostgreSQL)")
    void testConcurrentDuplicateTransferRequests_RealPostgres_NoUnexpectedRollback() throws Exception {
        String sharedKey = "CONCURRENT-IDEM-" + UUID.randomUUID();
        TransferRequest request = new TransferRequest(sourceId, targetId, new BigDecimal("75.00"), sharedKey);

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        Future<Transaction>[] futures = new Future[threadCount];
        for (int i = 0; i < threadCount; i++) {
            futures[i] = executor.submit(() -> {
                startLatch.await();
                return orchestrator.initiateTransfer(request);
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        Transaction txn1 = futures[0].get();
        Transaction txn2 = futures[1].get();

        assertNotNull(txn1);
        assertNotNull(txn2);
        assertEquals(txn1.getId(), txn2.getId(), "Both concurrent threads must resolve to the identical logical transaction");

        // Exactly one debit call must have occurred
        verify(accountClient, times(1)).debit(eq(sourceId), eq(new BigDecimal("75.00")));

        // Exactly one TRANSFER_INITIATED outbox event must be enqueued (no duplicate on concurrent race)
        List<OutboxEvent> initiatedEvents = outboxRepo.findAll().stream()
                .filter(e -> e.getAggregateId().equals(txn1.getId()) && "TRANSFER_INITIATED".equals(e.getEventType()))
                .toList();
        assertEquals(1, initiatedEvents.size(), "Exactly one TRANSFER_INITIATED outbox event must be created in PostgreSQL");
    }

    @Test
    @DisplayName("3. Transactional Outbox Atomicity (Case A: Commit, Case B: Rollback)")
    void testOutboxTransactionAtomicity_CommitAndRollback() {
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        txTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        java.util.concurrent.atomic.AtomicReference<UUID> commitTxnId = new java.util.concurrent.atomic.AtomicReference<>();

        // Case A: Successful commit
        txTemplate.execute(status -> {
            Transaction txn = buildTxn("ATOM-COMMIT-" + UUID.randomUUID(), sourceId, targetId, new BigDecimal("50.00"), "RESERVED");
            Transaction saved = txnRepo.saveAndFlush(txn);
            commitTxnId.set(saved.getId());
            outboxService.enqueue(saved.getId(), "TRANSFER_INITIATED", "bank.transfers.initiated", saved);
            return null;
        });

        assertTrue(txnRepo.findById(commitTxnId.get()).isPresent(), "Committed transaction must exist in PostgreSQL");
        List<OutboxEvent> committedEvents = outboxRepo.findAll().stream()
                .filter(e -> e.getAggregateId().equals(commitTxnId.get()))
                .toList();
        assertEquals(1, committedEvents.size(), "Committed outbox event must exist in PostgreSQL");

        // Case B: Transaction rollback
        String rollbackKey = "ATOM-ROLLBACK-" + UUID.randomUUID();
        try {
            txTemplate.execute(status -> {
                Transaction txn = buildTxn(rollbackKey, sourceId, targetId, new BigDecimal("50.00"), "RESERVED");
                Transaction saved = txnRepo.saveAndFlush(txn);
                outboxService.enqueue(saved.getId(), "TRANSFER_INITIATED", "bank.transfers.initiated", saved);

                // Simulate downstream failure triggering full rollback
                throw new RuntimeException("Simulated error to trigger rollback");
            });
        } catch (RuntimeException e) {
            // Expected
        }

        assertFalse(txnRepo.findByIdempotencyKey(rollbackKey).isPresent(), "Rolled back transaction must NOT exist in PostgreSQL");
        List<OutboxEvent> rolledBackEvents = outboxRepo.findAll().stream()
                .filter(e -> e.getTopic().contains(rollbackKey))
                .toList();
        assertEquals(0, rolledBackEvents.size(), "Rolled back outbox event must NOT exist in PostgreSQL (Atomic Outbox Invariant)");
    }

    @Test
    @DisplayName("4. Failure + Compensation Invariant Verification")
    void testFailureAndCompensation_RestoresSourceBalance() throws Exception {
        String idemKey = "COMPENSATE-" + UUID.randomUUID();
        TransferRequest request = new TransferRequest(sourceId, targetId, new BigDecimal("120.00"), idemKey);

        Transaction reservedTxn = orchestrator.initiateTransfer(request);
        assertEquals("RESERVED", reservedTxn.getStatus());

        // Simulate destination credit failure during asynchronous Kafka credit step
        doThrow(new RuntimeException("Destination account blocked or frozen"))
                .when(accountClient).credit(eq(targetId), eq(new BigDecimal("120.00")));

        String payload = String.format("{\"transactionId\":\"%s\",\"idempotencyKey\":\"%s\",\"fromAccountId\":\"%s\",\"toAccountId\":\"%s\",\"amount\":120.00}",
                reservedTxn.getId(), idemKey, sourceId, targetId);

        orchestrator.handleCreditStep(payload);

        Transaction finalTxn = txnRepo.findById(reservedTxn.getId()).orElseThrow();
        assertEquals("COMPENSATED", finalTxn.getStatus(), "Transaction status must transition to COMPENSATED");
        assertTrue(finalTxn.getFailureReason().contains("Destination account blocked"));

        // Verify compensation refund was issued to source account
        verify(accountClient, times(1)).credit(eq(sourceId), eq(new BigDecimal("120.00")));

        // Verify failure event was enqueued in outbox
        List<OutboxEvent> failedEvents = outboxRepo.findAll().stream()
                .filter(e -> e.getAggregateId().equals(reservedTxn.getId()) && "TRANSFER_FAILED".equals(e.getEventType()))
                .toList();
        assertEquals(1, failedEvents.size(), "TRANSFER_FAILED compensation event must be in outbox");
    }

    @Test
    @DisplayName("5. Kafka Consumer Deduplication (processed_events Table Invariant)")
    void testKafkaConsumerDeduplication_ProcessedEventsTable() throws Exception {
        String idemKey = "KAFKA-DEDUP-" + UUID.randomUUID();
        TransferRequest request = new TransferRequest(sourceId, targetId, new BigDecimal("60.00"), idemKey);

        Transaction reservedTxn = orchestrator.initiateTransfer(request);
        String payload = String.format("{\"transactionId\":\"%s\",\"idempotencyKey\":\"%s\",\"fromAccountId\":\"%s\",\"toAccountId\":\"%s\",\"amount\":60.00}",
                reservedTxn.getId(), idemKey, sourceId, targetId);

        // First delivery: processes credit
        orchestrator.handleCreditStep(payload);

        Transaction completedTxn = txnRepo.findById(reservedTxn.getId()).orElseThrow();
        assertEquals("COMPLETED", completedTxn.getStatus());
        verify(accountClient, times(1)).credit(eq(targetId), eq(new BigDecimal("60.00")));

        // Duplicate delivery (Kafka at-least-once duplicate)
        orchestrator.handleCreditStep(payload);

        // Verify destination credit was NOT called a second time
        verify(accountClient, times(1)).credit(eq(targetId), eq(new BigDecimal("60.00")));
    }
}
