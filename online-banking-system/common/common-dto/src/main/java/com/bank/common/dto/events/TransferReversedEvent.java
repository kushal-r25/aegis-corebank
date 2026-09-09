package com.bank.common.dto.events;

import java.math.BigDecimal;
import java.util.UUID;

public record TransferReversedEvent(
        UUID transactionId,
        UUID fromAccountId,
        UUID toAccountId,
        BigDecimal amount,
        String reason
) {}