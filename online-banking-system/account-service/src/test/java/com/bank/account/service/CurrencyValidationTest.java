package com.bank.account.service;

import com.bank.account.entity.Account;
import com.bank.account.entity.LedgerEntry;
import com.bank.account.repository.AccountRepository;
import com.bank.account.repository.LedgerEntryRepository;
import com.bank.common.exceptions.CurrencyMismatchException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(
        properties = {
                "spring.autoconfigure.exclude=" +
                        "org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration," +
                        "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration," +
                        "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
        }
)
@ActiveProfiles("test")
class CurrencyValidationTest {

    @Autowired
    private AccountService accountService;

    @Autowired
    private AccountRepository accountRepo;

    @Autowired
    private LedgerEntryRepository ledgerRepo;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.bank.account.kafka.AccountEventPublisher accountEventPublisher;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.bank.common.kafka.EventPublisher eventPublisher;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
    }

    @Test
    @DisplayName("1. Default currency on creation is USD")
    void testDefaultCurrencyIsUSD() {
        Account account = accountService.createAccount(userId, "CHECKING");
        assertThat(account.getCurrency()).isEqualTo("USD");
    }

    @Test
    @DisplayName("2. Explicit INR account creation")
    void testINRAccountCreation() {
        Account account = accountService.createAccount(userId, "SAVINGS", "INR");
        assertThat(account.getCurrency()).isEqualTo("INR");
        assertThat(account.getBalance()).isEqualByComparingTo("0.0000");
    }

    @Test
    @DisplayName("3. INR deposit records INR ledger entry")
    void testINRDeposit() {
        Account account = accountService.createAccount(userId, "SAVINGS", "INR");
        accountService.deposit(account.getId(), new BigDecimal("250000.00"), "Initial INR Deposit", "REF-INR-1");

        Account reloaded = accountService.getAccount(account.getId());
        assertThat(reloaded.getBalance()).isEqualByComparingTo("250000.00");
        assertThat(reloaded.getCurrency()).isEqualTo("INR");

        List<LedgerEntry> ledger = accountService.getLedger(account.getId());
        assertThat(ledger).hasSize(1);
        assertThat(ledger.get(0).getCurrency()).isEqualTo("INR");
        assertThat(ledger.get(0).getAmount()).isEqualByComparingTo("250000.00");
    }

    @Test
    @DisplayName("4. INR withdrawal records INR ledger entry")
    void testINRWithdrawal() {
        Account account = accountService.createAccount(userId, "CHECKING", "INR");
        accountService.deposit(account.getId(), new BigDecimal("100000.00"), "Deposit", "REF-INR-2");
        accountService.withdraw(account.getId(), new BigDecimal("25000.00"), "ATM Cash", "REF-INR-3");

        Account reloaded = accountService.getAccount(account.getId());
        assertThat(reloaded.getBalance()).isEqualByComparingTo("75000.00");

        List<LedgerEntry> ledger = accountService.getLedger(account.getId());
        assertThat(ledger.get(0).getEntryType()).isEqualTo("WITHDRAWAL");
        assertThat(ledger.get(0).getCurrency()).isEqualTo("INR");
        assertThat(ledger.get(0).getAmount()).isEqualByComparingTo("-25000.00");
    }

    @Test
    @DisplayName("5. Same currency INR -> INR transfer succeeds")
    void testSameCurrencyINRTransfer() {
        Account inr1 = accountService.createAccount(userId, "CHECKING", "INR");
        Account inr2 = accountService.createAccount(UUID.randomUUID(), "SAVINGS", "INR");

        accountService.deposit(inr1.getId(), new BigDecimal("50000.00"), "Seed", "REF-SEED");
        accountService.transferDirect(inr1.getId(), inr2.getId(), new BigDecimal("20000.00"));

        Account r1 = accountService.getAccount(inr1.getId());
        Account r2 = accountService.getAccount(inr2.getId());

        assertThat(r1.getBalance()).isEqualByComparingTo("30000.00");
        assertThat(r2.getBalance()).isEqualByComparingTo("20000.00");

        List<LedgerEntry> l1 = accountService.getLedger(inr1.getId());
        List<LedgerEntry> l2 = accountService.getLedger(inr2.getId());
        assertThat(l1.get(0).getCurrency()).isEqualTo("INR");
        assertThat(l2.get(0).getCurrency()).isEqualTo("INR");
    }

    @Test
    @DisplayName("6. Cross-currency INR -> USD transfer is strictly rejected")
    void testCrossCurrencyTransferRejected() {
        Account inrAcc = accountService.createAccount(userId, "CHECKING", "INR");
        Account usdAcc = accountService.createAccount(UUID.randomUUID(), "CHECKING", "USD");

        accountService.deposit(inrAcc.getId(), new BigDecimal("50000.00"), "Seed INR", "REF-INR-SEED");
        accountService.deposit(usdAcc.getId(), new BigDecimal("500.00"), "Seed USD", "REF-USD-SEED");

        assertThrows(CurrencyMismatchException.class, () ->
                accountService.transferDirect(inrAcc.getId(), usdAcc.getId(), new BigDecimal("1000.00"))
        );

        // Verify balances remain unmodified
        assertThat(accountService.getAccount(inrAcc.getId()).getBalance()).isEqualByComparingTo("50000.00");
        assertThat(accountService.getAccount(usdAcc.getId()).getBalance()).isEqualByComparingTo("500.00");
    }

    @Test
    @DisplayName("7. Cross-currency USD -> INR transfer is strictly rejected")
    void testCrossCurrencyUSDToINRRejected() {
        Account usdAcc = accountService.createAccount(userId, "CHECKING", "USD");
        Account inrAcc = accountService.createAccount(UUID.randomUUID(), "CHECKING", "INR");

        accountService.deposit(usdAcc.getId(), new BigDecimal("1000.00"), "Seed USD", "REF-USD-SEED-2");

        assertThrows(CurrencyMismatchException.class, () ->
                accountService.transferDirect(usdAcc.getId(), inrAcc.getId(), new BigDecimal("100.00"))
        );

        assertThat(accountService.getAccount(usdAcc.getId()).getBalance()).isEqualByComparingTo("1000.00");
    }

    @Test
    @DisplayName("8. INR paired double-entry reversal restores exact balances")
    void testINRReversal() {
        Account inr1 = accountService.createAccount(userId, "CHECKING", "INR");
        Account inr2 = accountService.createAccount(UUID.randomUUID(), "SAVINGS", "INR");

        accountService.deposit(inr1.getId(), new BigDecimal("100000.00"), "Seed", "REF-SEED");
        accountService.transferDirect(inr1.getId(), inr2.getId(), new BigDecimal("30000.00"));

        // Reverse transfer: debit inr2, credit inr1
        accountService.reverseTransfer(inr2.getId(), inr1.getId(), new BigDecimal("30000.00"), "REV-TXN-INR-101");

        assertThat(accountService.getAccount(inr1.getId()).getBalance()).isEqualByComparingTo("100000.00");
        assertThat(accountService.getAccount(inr2.getId()).getBalance()).isEqualByComparingTo("0.00");

        List<LedgerEntry> l1 = accountService.getLedger(inr1.getId());
        assertThat(l1.get(0).getEntryType()).isEqualTo("REVERSAL_CREDIT");
        assertThat(l1.get(0).getCurrency()).isEqualTo("INR");
    }
}
