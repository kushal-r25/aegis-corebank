package com.bank.common.dto.events;

import java.util.UUID;

public record TransferFailedEvent(UUID transactionId, String reason) {}
