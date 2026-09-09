package com.bank.common.dto.events;

import java.util.UUID;

public record DebitFailedEvent(UUID transactionId, String reason) {}
