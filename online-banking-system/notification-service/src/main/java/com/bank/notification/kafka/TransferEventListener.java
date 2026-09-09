package com.bank.notification.kafka;

import com.bank.common.dto.events.TransferCompletedEvent;
import com.bank.common.dto.events.TransferFailedEvent;
import com.bank.common.kafka.KafkaTopics;
import com.bank.notification.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consumer-only side of the Kafka event flow: transfer initiated -> processed
 * (transaction-service) -> notified (here). Events are published as raw JSON strings
 * by transaction-service's EventPublisher/outbox, so we deserialize manually rather
 * than relying on a typed Kafka JsonDeserializer.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TransferEventListener {

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = KafkaTopics.TRANSFER_COMPLETED, groupId = "notification-service")
    public void onTransferCompleted(String rawJson) throws Exception {
        TransferCompletedEvent event = objectMapper.readValue(rawJson, TransferCompletedEvent.class);
        notificationService.notifyTransferCompleted(event.transactionId());
    }

    @KafkaListener(topics = KafkaTopics.TRANSFER_FAILED, groupId = "notification-service")
    public void onTransferFailed(String rawJson) throws Exception {
        TransferFailedEvent event = objectMapper.readValue(rawJson, TransferFailedEvent.class);
        notificationService.notifyTransferFailed(event.transactionId(), event.reason());
    }

    @KafkaListener(topics = KafkaTopics.TRANSFER_REVERSED, groupId = "notification-service")
    public void onTransferReversed(String rawJson) throws Exception {
        com.bank.common.dto.events.TransferReversedEvent event = objectMapper.readValue(
                rawJson, com.bank.common.dto.events.TransferReversedEvent.class);
        notificationService.notifyTransferReversed(event.transactionId(), event.reason());
    }
}
