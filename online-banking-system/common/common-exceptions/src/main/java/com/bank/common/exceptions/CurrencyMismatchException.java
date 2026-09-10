package com.bank.common.exceptions;

public class CurrencyMismatchException extends RuntimeException {
    public CurrencyMismatchException(String message) {
        super(message);
    }

    public CurrencyMismatchException(String sourceCurrency, String targetCurrency) {
        super(String.format("Cross-currency transfers are not supported without FX conversion (Source: %s, Destination: %s)", sourceCurrency, targetCurrency));
    }
}
