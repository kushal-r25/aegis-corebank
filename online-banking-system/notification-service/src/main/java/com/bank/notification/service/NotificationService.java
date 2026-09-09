package com.bank.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Stands in for a real delivery channel (email/SMS/push). For a portfolio project,
 * logging + an in-memory list you can inspect via GET /notifications is enough to
 * prove the Kafka event -> notification flow works end-to-end; swap sendXxx() for a
 * real provider client (e.g. Twilio, SES) without touching the listener layer.
 */
@Slf4j
@Service
public class NotificationService {

    private final List<Notification> sent = new CopyOnWriteArrayList<>();

    public void notifyTransferCompleted(UUID transactionId) {
        String message = "Your transfer " + transactionId + " completed successfully.";
        log.info("[NOTIFY] {}", message);
        sent.add(new Notification(transactionId, "TRANSFER_COMPLETED", message, Instant.now()));
    }

    public void notifyTransferFailed(UUID transactionId, String reason) {
        String message = "Your transfer " + transactionId + " failed: " + reason;
        log.info("[NOTIFY] {}", message);
        sent.add(new Notification(transactionId, "TRANSFER_FAILED", message, Instant.now()));
    }

    public void notifyTransferReversed(UUID transactionId, String reason) {
        String message = "Your transfer " + transactionId + " was reversed: " + (reason != null ? reason : "Compensating reversal");
        log.info("[NOTIFY] {}", message);
        sent.add(new Notification(transactionId, "TRANSFER_REVERSED", message, Instant.now()));
    }

    public List<Notification> all() {
        return List.copyOf(sent);
    }
}
