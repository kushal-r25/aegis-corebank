package com.bank.common.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        UUID fromAccountId,
        UUID toAccountId,
        BigDecimal amount,
        String status,
        String failureReason,
        String riskFlag,
        Instant createdAt,
        String currency
) {
    public TransactionResponse(UUID id, UUID fromAccountId, UUID toAccountId, BigDecimal amount, String status, String failureReason, String riskFlag, Instant createdAt) {
        this(id, fromAccountId, toAccountId, amount, status, failureReason, riskFlag, createdAt, "USD");
    }
}
