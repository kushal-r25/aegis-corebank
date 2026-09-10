package com.bank.common.dto.events;

import java.math.BigDecimal;
import java.util.UUID;

public record TransferInitiatedEvent(
        UUID transactionId,
        String idempotencyKey,
        UUID fromAccountId,
        UUID toAccountId,
        BigDecimal amount,
        String currency
) {
    public TransferInitiatedEvent(UUID transactionId, String idempotencyKey, UUID fromAccountId, UUID toAccountId, BigDecimal amount) {
        this(transactionId, idempotencyKey, fromAccountId, toAccountId, amount, "USD");
    }
}
