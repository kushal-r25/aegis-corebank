package com.bank.common.dto;

public enum CurrencyCode {
    USD("$", "US Dollar"),
    INR("₹", "Indian Rupee");

    private final String symbol;
    private final String displayName;

    CurrencyCode(String symbol, String displayName) {
        this.symbol = symbol;
        this.displayName = displayName;
    }

    public String getSymbol() {
        return symbol;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static boolean isValid(String code) {
        if (code == null || code.isBlank()) return false;
        for (CurrencyCode c : values()) {
            if (c.name().equalsIgnoreCase(code.trim())) {
                return true;
            }
        }
        return false;
    }

    public static CurrencyCode fromString(String code) {
        if (code == null || code.isBlank()) return USD;
        for (CurrencyCode c : values()) {
            if (c.name().equalsIgnoreCase(code.trim())) {
                return c;
            }
        }
        throw new IllegalArgumentException("Unsupported currency code: " + code + ". Supported: USD, INR");
    }
}
