package com.bank.common.dto.events;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditCompletedEvent(UUID transactionId, UUID toAccountId, BigDecimal amount) {}
