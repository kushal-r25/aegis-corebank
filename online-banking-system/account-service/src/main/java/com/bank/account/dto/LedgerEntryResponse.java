package com.bank.account.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record LedgerEntryResponse(
        UUID id,
        UUID accountId,
        BigDecimal amount,
        String entryType,
        BigDecimal balanceAfter,
        String referenceId,
        String description,
        Instant createdAt,
        String currency
) {
    public LedgerEntryResponse(UUID id, UUID accountId, BigDecimal amount, String entryType, BigDecimal balanceAfter, String referenceId, String description, Instant createdAt) {
        this(id, accountId, amount, entryType, balanceAfter, referenceId, description, createdAt, "USD");
    }
}
