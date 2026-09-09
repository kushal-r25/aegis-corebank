package com.bank.common.dto.events;

import java.math.BigDecimal;
import java.util.UUID;

public record BalanceChangedEvent(UUID accountId, BigDecimal newBalance, String reason) {}
