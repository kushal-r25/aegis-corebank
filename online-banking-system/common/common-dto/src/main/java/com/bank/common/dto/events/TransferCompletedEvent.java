package com.bank.common.dto.events;

import java.util.UUID;

public record TransferCompletedEvent(UUID transactionId) {}
