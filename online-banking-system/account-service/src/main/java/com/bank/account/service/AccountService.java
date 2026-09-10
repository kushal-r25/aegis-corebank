package com.bank.account.service;

import com.bank.account.entity.Account;
import com.bank.account.entity.LedgerEntry;
import com.bank.account.kafka.AccountEventPublisher;
import com.bank.account.repository.AccountRepository;
import com.bank.account.repository.LedgerEntryRepository;
import com.bank.common.dto.CurrencyCode;
import com.bank.common.exceptions.AccountClosedException;
import com.bank.common.exceptions.AccountNotFoundException;
import com.bank.common.exceptions.CurrencyMismatchException;
import com.bank.common.exceptions.InsufficientFundsException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepo;
    private final LedgerEntryRepository ledgerRepo;
    private final AccountEventPublisher eventPublisher;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public Account createAccount(UUID userId, String accountType) {
        return createAccount(userId, accountType, "USD");
    }

    @Transactional
    public Account createAccount(UUID userId, String accountType, String currency) {
        CurrencyCode validCurrency = CurrencyCode.fromString(currency != null ? currency : "USD");

        Account account = new Account();
        account.setUserId(userId);
        account.setAccountType(accountType);
        account.setAccountNumber(generateAccountNumber());
        account.setCurrency(validCurrency.name());
        account.setBalance(BigDecimal.ZERO);
        account.setStatus("ACTIVE");
        return accountRepo.save(account);
    }

    public Account getAccount(UUID accountId) {
        return accountRepo.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId));
    }

    public List<Account> getAccountsForUser(UUID userId) {
        return accountRepo.findByUserId(userId);
    }

    public List<Account> getAllAccounts() {
        return accountRepo.findAll();
    }

    @Transactional
    public void closeAccount(UUID accountId) {
        Account account = accountRepo.findByIdForUpdate(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId));

        if (account.getBalance().compareTo(BigDecimal.ZERO) != 0) {
            throw new IllegalStateException("Cannot close account with non-zero balance");
        }
        account.setStatus("CLOSED");
        accountRepo.save(account);
    }

    @Transactional
    public Account freezeAccount(UUID accountId, String reason) {
        Account account = accountRepo.findByIdForUpdate(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId));
        account.setStatus("FROZEN");
        Account saved = accountRepo.save(account);
        log.info("Account {} frozen. Reason: {}", accountId, reason);
        return saved;
    }

    @Transactional
    public Account unfreezeAccount(UUID accountId) {
        Account account = accountRepo.findByIdForUpdate(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId));
        account.setStatus("ACTIVE");
        Account saved = accountRepo.save(account);
        log.info("Account {} unfrozen", accountId);
        return saved;
    }

    @Transactional
    @CacheEvict(value = "accountBalance", key = "#accountId")
    public Account deposit(UUID accountId, BigDecimal amount, String description, String referenceId) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Deposit amount must be positive");
        }
        Account account = accountRepo.findByIdForUpdate(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId));

        assertActive(account);

        account.setBalance(account.getBalance().add(amount));
        Account saved = accountRepo.save(account);

        recordLedger(accountId, amount, "DEPOSIT", saved.getBalance(), referenceId,
                description != null ? description : "Funds deposit", saved.getCurrency());
        eventPublisher.publishBalanceChanged(accountId, saved.getBalance(), "DEPOSIT");
        return saved;
    }

    @Transactional
    @CacheEvict(value = "accountBalance", key = "#accountId")
    public Account withdraw(UUID accountId, BigDecimal amount, String description, String referenceId) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be positive");
        }
        Account account = accountRepo.findByIdForUpdate(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId));

        assertActive(account);

        if (account.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(accountId);
        }

        account.setBalance(account.getBalance().subtract(amount));
        Account saved = accountRepo.save(account);

        recordLedger(accountId, amount.negate(), "WITHDRAWAL", saved.getBalance(), referenceId,
                description != null ? description : "Funds withdrawal", saved.getCurrency());
        eventPublisher.publishBalanceChanged(accountId, saved.getBalance(), "WITHDRAWAL");
        return saved;
    }

    /**
     * Debits an account under a pessimistic row lock.
     */
    @Transactional
    @CacheEvict(value = "accountBalance", key = "#accountId")
    public Account debit(UUID accountId, BigDecimal amount) {
        return debit(accountId, amount, null);
    }

    @Transactional
    @CacheEvict(value = "accountBalance", key = "#accountId")
    public Account debit(UUID accountId, BigDecimal amount, String referenceId) {
        Account account = accountRepo.findByIdForUpdate(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId));

        assertActive(account);

        if (account.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(accountId);
        }

        account.setBalance(account.getBalance().subtract(amount));
        Account saved = accountRepo.save(account);

        recordLedger(accountId, amount.negate(), "TRANSFER_OUT", saved.getBalance(), referenceId, "Transfer debit", saved.getCurrency());
        eventPublisher.publishBalanceChanged(accountId, saved.getBalance(), "DEBIT");
        return saved;
    }

    @Transactional
    @CacheEvict(value = "accountBalance", key = "#accountId")
    public Account credit(UUID accountId, BigDecimal amount) {
        return credit(accountId, amount, null);
    }

    @Transactional
    @CacheEvict(value = "accountBalance", key = "#accountId")
    public Account credit(UUID accountId, BigDecimal amount, String referenceId) {
        Account account = accountRepo.findByIdForUpdate(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId));

        assertActive(account);

        account.setBalance(account.getBalance().add(amount));
        Account saved = accountRepo.save(account);

        recordLedger(accountId, amount, "TRANSFER_IN", saved.getBalance(), referenceId, "Transfer credit", saved.getCurrency());
        eventPublisher.publishBalanceChanged(accountId, saved.getBalance(), "CREDIT");
        return saved;
    }

    /**
     * Reversal of transfer: debits the previously credited destination account and
     * credits the previously debited source account under deterministic UUID locks.
     */
    @Transactional
    public void reverseTransfer(UUID debitedAccountId, UUID creditedAccountId, BigDecimal amount, String referenceId) {
        UUID first = debitedAccountId.compareTo(creditedAccountId) < 0 ? debitedAccountId : creditedAccountId;
        UUID second = debitedAccountId.compareTo(creditedAccountId) < 0 ? creditedAccountId : debitedAccountId;

        Account a = accountRepo.findByIdForUpdate(first).orElseThrow(() -> new AccountNotFoundException(first));
        Account b = accountRepo.findByIdForUpdate(second).orElseThrow(() -> new AccountNotFoundException(second));

        Account debited = a.getId().equals(debitedAccountId) ? a : b;
        Account credited = a.getId().equals(debitedAccountId) ? b : a;

        assertActive(debited);
        assertActive(credited);

        if (!debited.getCurrency().equalsIgnoreCase(credited.getCurrency())) {
            throw new CurrencyMismatchException(debited.getCurrency(), credited.getCurrency());
        }

        if (debited.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(debitedAccountId);
        }

        debited.setBalance(debited.getBalance().subtract(amount));
        credited.setBalance(credited.getBalance().add(amount));

        accountRepo.save(debited);
        accountRepo.save(credited);

        recordLedger(debitedAccountId, amount.negate(), "REVERSAL_DEBIT", debited.getBalance(), referenceId, "Compensating reversal debit", debited.getCurrency());
        recordLedger(creditedAccountId, amount, "REVERSAL_CREDIT", credited.getBalance(), referenceId, "Compensating reversal credit", credited.getCurrency());

        eventPublisher.publishBalanceChanged(debitedAccountId, debited.getBalance(), "REVERSAL_DEBIT");
        eventPublisher.publishBalanceChanged(creditedAccountId, credited.getBalance(), "REVERSAL_CREDIT");
    }

    /**
     * Locks two accounts for a transfer in a consistent global order (by UUID).
     */
    @Transactional
    public void transferDirect(UUID fromId, UUID toId, BigDecimal amount) {
        UUID first = fromId.compareTo(toId) < 0 ? fromId : toId;
        UUID second = fromId.compareTo(toId) < 0 ? toId : fromId;

        Account a = accountRepo.findByIdForUpdate(first).orElseThrow(() -> new AccountNotFoundException(first));
        Account b = accountRepo.findByIdForUpdate(second).orElseThrow(() -> new AccountNotFoundException(second));

        Account from = a.getId().equals(fromId) ? a : b;
        Account to = a.getId().equals(fromId) ? b : a;

        assertActive(from);
        assertActive(to);

        if (!from.getCurrency().equalsIgnoreCase(to.getCurrency())) {
            throw new CurrencyMismatchException(from.getCurrency(), to.getCurrency());
        }

        if (from.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(fromId);
        }

        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));

        accountRepo.save(from);
        accountRepo.save(to);

        recordLedger(fromId, amount.negate(), "TRANSFER_OUT", from.getBalance(), null, "Direct transfer out", from.getCurrency());
        recordLedger(toId, amount, "TRANSFER_IN", to.getBalance(), null, "Direct transfer in", to.getCurrency());

        eventPublisher.publishBalanceChanged(fromId, from.getBalance(), "TRANSFER_OUT");
        eventPublisher.publishBalanceChanged(toId, to.getBalance(), "TRANSFER_IN");
    }

    public List<LedgerEntry> getLedger(UUID accountId) {
        return ledgerRepo.findByAccountIdOrderByCreatedAtDesc(accountId);
    }

    private void recordLedger(UUID accountId, BigDecimal amount, String type, BigDecimal balanceAfter, String refId, String desc, String currency) {
        LedgerEntry entry = new LedgerEntry();
        entry.setAccountId(accountId);
        entry.setAmount(amount);
        entry.setCurrency(currency != null ? currency : "USD");
        entry.setEntryType(type);
        entry.setBalanceAfter(balanceAfter);
        entry.setReferenceId(refId);
        entry.setDescription(desc);
        ledgerRepo.save(entry);
    }

    private void assertActive(Account account) {
        if (!"ACTIVE".equals(account.getStatus())) {
            throw new AccountClosedException(account.getId());
        }
    }

    private String generateAccountNumber() {
        String candidate;
        do {
            candidate = String.valueOf(1_000_000_0000L + (long) (random.nextDouble() * 8_999_999_9999L));
        } while (accountRepo.existsByAccountNumber(candidate));
        return candidate;
    }
}
