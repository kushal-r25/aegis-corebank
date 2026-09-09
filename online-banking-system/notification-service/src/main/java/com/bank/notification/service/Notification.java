package com.bank.notification.service;

import java.time.Instant;
import java.util.UUID;

public record Notification(
        UUID transactionId,
        String type,       // TRANSFER_COMPLETED, TRANSFER_FAILED
        String message,
        Instant timestamp
) {}
