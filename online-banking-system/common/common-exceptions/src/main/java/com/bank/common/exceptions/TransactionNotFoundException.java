package com.bank.common.exceptions;

import java.util.UUID;

public class TransactionNotFoundException extends RuntimeException {
    public TransactionNotFoundException(UUID transactionId) {
        super("Transaction not found: " + transactionId);
    }
}
