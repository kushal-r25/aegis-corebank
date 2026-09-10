package com.bank.common.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AccountResponse(
        UUID id,
        UUID userId,
        String accountNumber,
        String accountType,
        BigDecimal balance,
        String status,
        Instant createdAt,
        String currency
) {
    public AccountResponse(UUID id, UUID userId, String accountNumber, String accountType, BigDecimal balance, String status, Instant createdAt) {
        this(id, userId, accountNumber, accountType, balance, status, createdAt, "USD");
    }
}
