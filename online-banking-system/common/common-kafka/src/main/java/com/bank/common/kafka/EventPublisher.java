package com.bank.common.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class EventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    /** Serializes {@code event} to JSON and publishes it. Prefer this from typed callers. */
    @SneakyThrows
    public void publish(String topic, String key, Object event) {
        String json = objectMapper.writeValueAsString(event);
        publishRaw(topic, key, json);
    }

    /** Publishes an already-serialized JSON string as-is (used by the outbox poller). */
    public void publishRaw(String topic, String key, String json) {
        kafkaTemplate.send(topic, key, json).whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish event to topic [{}] key [{}]: {}", topic, key, ex.getMessage(), ex);
            } else {
                log.debug("Published event to topic [{}] key [{}]", topic, key);
            }
        });
    }
}
