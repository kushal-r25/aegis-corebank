package com.bank.transaction.service;

import com.bank.transaction.entity.AuditLog;
import com.bank.transaction.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditRepo;
    private final ObjectMapper objectMapper;

    @SneakyThrows
    public void record(UUID transactionId, String eventType, Object payload) {
        AuditLog log = new AuditLog();
        log.setTransactionId(transactionId);
        log.setEventType(eventType);
        log.setEventPayload(payload == null ? null : objectMapper.writeValueAsString(payload));
        auditRepo.save(log);
    }
}
