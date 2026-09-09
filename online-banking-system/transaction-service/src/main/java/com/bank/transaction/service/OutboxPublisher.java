package com.bank.transaction.service;

import com.bank.transaction.entity.OutboxEvent;
import com.bank.transaction.repository.OutboxEventRepository;
import com.bank.common.kafka.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Polls the outbox table for unpublished events and pushes them to Kafka, then marks
 * them published. At-least-once delivery — downstream consumers must be idempotent
 * (the saga's credit-step listener is, keyed by transactionId).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxPublisher {

    private final OutboxEventRepository outboxRepo;
    private final EventPublisher eventPublisher;

    @Scheduled(fixedDelay = 500)
    @Transactional
    public void publishPending() {
        List<OutboxEvent> pending = outboxRepo.findTop50ByPublishedFalseOrderByCreatedAtAsc();
        if (pending.isEmpty()) return;

        for (OutboxEvent event : pending) {
            try {
                eventPublisher.publishRaw(event.getTopic(), event.getAggregateId().toString(), event.getPayload());
                event.setPublished(true);
            } catch (Exception e) {
                log.error("Failed to publish outbox event {}: {}", event.getId(), e.getMessage(), e);
            }
        }
        outboxRepo.saveAll(pending);
        log.debug("Processed {} outbox events", pending.size());
    }
}
