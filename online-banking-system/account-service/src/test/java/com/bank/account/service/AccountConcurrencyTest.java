package com.bank.account.service;

import com.bank.account.entity.Account;
import com.bank.account.repository.AccountRepository;
import com.bank.common.exceptions.InsufficientFundsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the core correctness requirement: two (or ten) simultaneous transfers debiting
 * the same account must never corrupt the balance. Without the pessimistic lock in
 * AccountRepository.findByIdForUpdate, this test is flaky/fails intermittently with a
 * non-zero or negative final balance — that flakiness IS the proof the lock is doing
 * its job.
 */
@SpringBootTest(
        properties = {
                "spring.autoconfigure.exclude=" +
                        "org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration," +
                        "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration," +
                        "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
        }
)
@ActiveProfiles("test")
class AccountConcurrencyTest {

    @Autowired
    private AccountService accountService;

    @Autowired
    private AccountRepository accountRepo;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.bank.account.kafka.AccountEventPublisher accountEventPublisher;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.bank.common.kafka.EventPublisher eventPublisher;

    private UUID accountId;

    @BeforeEach
    void setUp() {
        Account acc = new Account();
        acc.setUserId(UUID.randomUUID());
        acc.setAccountNumber("TEST" + System.nanoTime());
        acc.setAccountType("SAVINGS");
        acc.setBalance(new BigDecimal("1000.00"));
        acc.setStatus("ACTIVE");
        accountId = accountRepo.save(acc).getId();
    }

    @Test
    void concurrentDebitsNeverCorruptBalance() throws InterruptedException {
        int threads = 10;
        BigDecimal each = new BigDecimal("100.00"); // exactly drains 1000 across 10 threads

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    accountService.debit(accountId, each);
                } catch (InsufficientFundsException ignored) {
                    // acceptable outcome for some threads if ordering causes early exhaustion
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        pool.shutdown();

        Account result = accountRepo.findById(accountId).orElseThrow();
        // must never go negative, and must be exactly zero since 10x100 == 1000 exactly
        assertThat(result.getBalance()).isEqualByComparingTo("0.00");
    }

    @Test
    void debitBeyondBalanceIsRejected() {
        org.junit.jupiter.api.Assertions.assertThrows(
                InsufficientFundsException.class,
                () -> accountService.debit(accountId, new BigDecimal("5000.00"))
        );
        Account result = accountRepo.findById(accountId).orElseThrow();
        assertThat(result.getBalance()).isEqualByComparingTo("1000.00"); // unchanged
    }
}
