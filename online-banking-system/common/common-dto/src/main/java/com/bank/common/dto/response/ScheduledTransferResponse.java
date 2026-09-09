package com.bank.common.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ScheduledTransferResponse(
        UUID id,
        UUID userId,
        UUID fromAccountId,
        UUID toAccountId,
        BigDecimal amount,
        String frequency,
        String description,
        String status,
        Instant nextExecutionTime,
        Instant lastExecutionTime,
        Instant createdAt
) {}