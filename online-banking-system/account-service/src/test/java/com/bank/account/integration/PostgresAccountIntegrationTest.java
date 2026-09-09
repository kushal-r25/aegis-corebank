package com.bank.account.integration;

import com.bank.account.entity.Account;
import com.bank.account.entity.LedgerEntry;
import com.bank.account.repository.AccountRepository;
import com.bank.account.repository.LedgerEntryRepository;
import com.bank.account.service.AccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("postgres")
@org.junit.jupiter.api.condition.EnabledIf("isPostgresAvailable")
public class PostgresAccountIntegrationTest {

    static boolean isPostgresAvailable() {
        try (java.net.Socket socket = new java.net.Socket()) {
            socket.connect(new java.net.InetSocketAddress("localhost", 5433), 500);
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
    private AccountRepository accountRepo;

    @Autowired
    private LedgerEntryRepository ledgerRepo;

    @Autowired
    private AccountService accountService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private UUID user1;
    private UUID user2;

    @BeforeEach
    void setUp() {
        user1 = UUID.randomUUID();
        user2 = UUID.randomUUID();
    }

    @Test
    @DisplayName("1. PostgreSQL NUMERIC(19,4) Precision Verification")
    void testNumeric19_4Precision() {
        Account account = new Account();
        account.setUserId(user1);
        account.setAccountNumber("ACC-P-" + (System.currentTimeMillis() % 1000000000L));
        account.setAccountType("CHECKING");
        BigDecimal exactAmount = new BigDecimal("1234567.8901");
        account.setBalance(exactAmount);
        account.setStatus("ACTIVE");

        Account saved = accountRepo.saveAndFlush(account);
        assertNotNull(saved.getId());

        Account queried = accountRepo.findById(saved.getId()).orElseThrow();
        assertEquals(0, exactAmount.compareTo(queried.getBalance()), "PostgreSQL must preserve exact 4 decimal precision");
        assertEquals("1234567.8901", queried.getBalance().toPlainString());
    }

    @Test
    @DisplayName("2. PostgreSQL Non-Negative Balance Constraint Enforcement")
    void testNonNegativeBalanceConstraint() {
        Account account = new Account();
        account.setUserId(user1);
        account.setAccountNumber("ACC-N-" + (System.currentTimeMillis() % 1000000000L));
        account.setAccountType("SAVINGS");
        account.setBalance(new BigDecimal("-50.0000"));
        account.setStatus("ACTIVE");

        assertThrows(DataIntegrityViolationException.class, () -> {
            accountRepo.saveAndFlush(account);
        }, "PostgreSQL chk_balance_nonneg constraint must reject negative balance directly at DB level");
    }

    @Test
    @DisplayName("3. Deterministic Pessimistic Locking & Deadlock-Free Concurrent Transfers")
    void testDeterministicPessimisticLocking() throws InterruptedException {
        Account accA = accountService.createAccount(user1, "SAVINGS");
        Account accB = accountService.createAccount(user2, "SAVINGS");

        accountService.deposit(accA.getId(), new BigDecimal("1000.00"), "Initial A", "REF-A");
        accountService.deposit(accB.getId(), new BigDecimal("1000.00"), "Initial B", "REF-B");

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    latch.await();
                    // Alternate transfer directions to provoke potential deadlocks: A -> B vs B -> A
                    if (index % 2 == 0) {
                        accountService.transferDirect(accA.getId(), accB.getId(), new BigDecimal("10.00"));
                    } else {
                        accountService.transferDirect(accB.getId(), accA.getId(), new BigDecimal("10.00"));
                    }
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    // unexpected error
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        latch.countDown();
        boolean completed = doneLatch.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All concurrent transfers must complete within timeout");
        assertEquals(threadCount, successCount.get(), "All 10 concurrent transfers must succeed without deadlocks");

        Account finalA = accountRepo.findById(accA.getId()).orElseThrow();
        Account finalB = accountRepo.findById(accB.getId()).orElseThrow();
        BigDecimal total = finalA.getBalance().add(finalB.getBalance());
        assertEquals(0, new BigDecimal("2000.0000").compareTo(total), "Conservation of money invariant must strictly hold across PostgreSQL");
    }

    @Test
    @DisplayName("4. PostgreSQL Transaction Rollback Atomicity")
    void testTransactionRollbackAtomicity() {
        Account account = accountService.createAccount(user1, "SAVINGS");
        accountService.deposit(account.getId(), new BigDecimal("500.00"), "Initial", "REF-INIT");

        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        txTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        try {
            txTemplate.execute(status -> {
                Account locked = accountRepo.findByIdForUpdate(account.getId()).orElseThrow();
                locked.setBalance(locked.getBalance().subtract(new BigDecimal("100.00")));
                accountRepo.saveAndFlush(locked);

                LedgerEntry entry = new LedgerEntry();
                entry.setAccountId(account.getId());
                entry.setAmount(new BigDecimal("100.00"));
                entry.setEntryType("DEBIT");
                entry.setBalanceAfter(locked.getBalance());
                ledgerRepo.saveAndFlush(entry);

                // Simulate business rule failure triggering transaction rollback
                throw new RuntimeException("Simulated unexpected failure requiring rollback");
            });
        } catch (RuntimeException e) {
            // Expected
        }

        Account afterRollback = accountRepo.findById(account.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("500.0000").compareTo(afterRollback.getBalance()), "Balance must remain unchanged after transaction rollback in PostgreSQL");
    }
}
