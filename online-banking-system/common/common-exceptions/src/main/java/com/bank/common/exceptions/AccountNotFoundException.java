package com.bank.common.exceptions;

import java.util.UUID;

public class AccountNotFoundException extends RuntimeException {
    public AccountNotFoundException(UUID accountId) {
        super("Account not found: " + accountId);
    }
    public AccountNotFoundException(String accountNumber) {
        super("Account not found: " + accountNumber);
    }
}
