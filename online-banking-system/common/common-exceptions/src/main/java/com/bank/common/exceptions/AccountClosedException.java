package com.bank.common.exceptions;

import java.util.UUID;

public class AccountClosedException extends RuntimeException {
    public AccountClosedException(UUID accountId) {
        super("Account is closed or frozen: " + accountId);
    }
}
