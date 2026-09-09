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
        Instant createdAt
) {}
