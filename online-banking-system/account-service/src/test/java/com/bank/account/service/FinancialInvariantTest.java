package com.bank.account.service;

import com.bank.account.entity.Account;
import com.bank.account.entity.LedgerEntry;
import com.bank.account.repository.AccountRepository;
import com.bank.account.repository.LedgerEntryRepository;
import com.bank.common.exceptions.AccountClosedException;
import com.bank.common.exceptions.InsufficientFundsException;
import org.junit.jupiter.api.BeforeEach;
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
class FinancialInvariantTest {

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

    private UUID sourceId;
    private UUID targetId;

    @BeforeEach
    void setUp() {
        Account a1 = new Account();
        a1.setUserId(UUID.randomUUID());
        a1.setAccountNumber("ACC-SRC-" + System.nanoTime());
        a1.setAccountType("CHECKING");
        a1.setBalance(new BigDecimal("5000.0000"));
        a1.setStatus("ACTIVE");
        sourceId = accountRepo.save(a1).getId();

        Account a2 = new Account();
        a2.setUserId(UUID.randomUUID());
        a2.setAccountNumber("ACC-TGT-" + System.nanoTime());
        a2.setAccountType("SAVINGS");
        a2.setBalance(new BigDecimal("1000.0000"));
        a2.setStatus("ACTIVE");
        targetId = accountRepo.save(a2).getId();
    }

    @Test
    void negativeDepositIsStrictlyRejected() {
        assertThrows(IllegalArgumentException.class, () ->
                accountService.deposit(sourceId, new BigDecimal("-100.00"), "Invalid deposit", "ref-1")
        );
        Account acc = accountRepo.findById(sourceId).orElseThrow();
        assertThat(acc.getBalance()).isEqualByComparingTo("5000.0000");
    }

    @Test
    void negativeWithdrawalIsStrictlyRejected() {
        assertThrows(IllegalArgumentException.class, () ->
                accountService.withdraw(sourceId, new BigDecimal("-50.00"), "Invalid withdrawal", "ref-2")
        );
        Account acc = accountRepo.findById(sourceId).orElseThrow();
        assertThat(acc.getBalance()).isEqualByComparingTo("5000.0000");
    }

    @Test
    void frozenAccountBlocksAllMutations() {
        accountService.freezeAccount(sourceId, "Compliance audit lock");
        Account frozen = accountRepo.findById(sourceId).orElseThrow();
        assertThat(frozen.getStatus()).isEqualTo("FROZEN");

        assertThrows(AccountClosedException.class, () ->
                accountService.deposit(sourceId, new BigDecimal("100.00"), "Deposit on frozen", "ref-3")
        );
        assertThrows(AccountClosedException.class, () ->
                accountService.withdraw(sourceId, new BigDecimal("100.00"), "Withdraw on frozen", "ref-4")
        );
    }

    @Test
    void closingAccountWithNonZeroBalanceIsRejected() {
        assertThrows(IllegalStateException.class, () ->
                accountService.closeAccount(sourceId)
        );
        Account acc = accountRepo.findById(sourceId).orElseThrow();
        assertThat(acc.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    void closingZeroBalanceAccountSucceeds() {
        accountService.withdraw(sourceId, new BigDecimal("5000.0000"), "Empty account", "ref-empty");
        accountService.closeAccount(sourceId);

        Account acc = accountRepo.findById(sourceId).orElseThrow();
        assertThat(acc.getStatus()).isEqualTo("CLOSED");
        assertThat(acc.getBalance()).isEqualByComparingTo("0.0000");
    }

    @Test
    void directTransferGeneratesStrictPairedDoubleEntryLedgerRecords() {
        BigDecimal transferAmount = new BigDecimal("1500.0000");
        accountService.transferDirect(sourceId, targetId, transferAmount);

        Account src = accountRepo.findById(sourceId).orElseThrow();
        Account tgt = accountRepo.findById(targetId).orElseThrow();

        assertThat(src.getBalance()).isEqualByComparingTo("3500.0000");
        assertThat(tgt.getBalance()).isEqualByComparingTo("2500.0000");

        List<LedgerEntry> srcLedger = ledgerRepo.findByAccountIdOrderByCreatedAtDesc(sourceId);
        List<LedgerEntry> tgtLedger = ledgerRepo.findByAccountIdOrderByCreatedAtDesc(targetId);

        assertThat(srcLedger).hasSizeGreaterThanOrEqualTo(1);
        assertThat(srcLedger.get(0).getEntryType()).isEqualTo("TRANSFER_OUT");
        assertThat(srcLedger.get(0).getAmount()).isEqualByComparingTo("-1500.0000");
        assertThat(srcLedger.get(0).getBalanceAfter()).isEqualByComparingTo("3500.0000");

        assertThat(tgtLedger).hasSizeGreaterThanOrEqualTo(1);
        assertThat(tgtLedger.get(0).getEntryType()).isEqualTo("TRANSFER_IN");
        assertThat(tgtLedger.get(0).getAmount()).isEqualByComparingTo("1500.0000");
        assertThat(tgtLedger.get(0).getBalanceAfter()).isEqualByComparingTo("2500.0000");
    }

    @Test
    void pairedReversalRestoresAuthoritativeBalances() {
        BigDecimal transferAmount = new BigDecimal("2000.0000");
        accountService.transferDirect(sourceId, targetId, transferAmount);

        // Compensating reversal: debit targetId, credit sourceId
        accountService.reverseTransfer(targetId, sourceId, transferAmount, "TXN-REV-TEST-001");

        Account src = accountRepo.findById(sourceId).orElseThrow();
        Account tgt = accountRepo.findById(targetId).orElseThrow();

        assertThat(src.getBalance()).isEqualByComparingTo("5000.0000");
        assertThat(tgt.getBalance()).isEqualByComparingTo("1000.0000");
    }
}
