package com.bank.common.exceptions;

public class TransferBlockedException extends RuntimeException {
    public TransferBlockedException(String reason) {
        super("Transfer blocked: " + reason);
    }
}
