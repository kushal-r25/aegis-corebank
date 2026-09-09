package com.bank.transaction.service;

import com.bank.transaction.entity.OutboxEvent;
import com.bank.transaction.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OutboxService {

    private final OutboxEventRepository outboxRepo;
    private final ObjectMapper objectMapper;

    /** Must be called from within the SAME @Transactional method that changes the business state. */
    @SneakyThrows
    public void enqueue(UUID aggregateId, String eventType, String topic, Object payload) {
        String json = objectMapper.writeValueAsString(payload);
        outboxRepo.save(new OutboxEvent(aggregateId, eventType, topic, json));
    }
}
