package com.bank.account.service;

import com.bank.account.entity.Account;
import com.bank.account.repository.AccountRepository;
import com.bank.common.exceptions.AccountNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountQueryService {

    private final AccountRepository accountRepo;

    /**
     * Cache-aside read. 30s TTL configured in RedisConfig. Evicted explicitly by
     * AccountService.debit/credit so a balance change is visible on the next read
     * well within the TTL window in the common case.
     */
    @Cacheable(value = "accountBalance", key = "#accountId")
    public BigDecimal getBalance(UUID accountId) {
        return accountRepo.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId))
                .getBalance();
    }

    public Account getAccount(UUID accountId) {
        return accountRepo.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId));
    }
}
