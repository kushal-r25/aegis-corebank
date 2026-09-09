package com.bank.common.dto.events;

import java.math.BigDecimal;
import java.util.UUID;

public record DebitCompletedEvent(UUID transactionId, UUID fromAccountId, BigDecimal amount) {}
