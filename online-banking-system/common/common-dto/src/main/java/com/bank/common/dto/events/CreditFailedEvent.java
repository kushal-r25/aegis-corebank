package com.bank.common.dto.events;

import java.util.UUID;

public record CreditFailedEvent(UUID transactionId, String reason) {}
