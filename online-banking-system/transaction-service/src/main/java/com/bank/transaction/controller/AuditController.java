package com.bank.transaction.controller;

import com.bank.transaction.dto.AuditTraceResponse;
import com.bank.transaction.entity.AuditLog;
import com.bank.transaction.entity.OutboxEvent;
import com.bank.transaction.entity.Transaction;
import com.bank.transaction.repository.AuditLogRepository;
import com.bank.transaction.repository.OutboxEventRepository;
import com.bank.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/audit")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('AUDITOR', 'ADMIN')")
public class AuditController {

    private final TransactionRepository txnRepo;
    private final AuditLogRepository auditRepo;
    private final OutboxEventRepository outboxRepo;

    @GetMapping("/trace/{transactionId}")
    public ResponseEntity<AuditTraceResponse> traceTransaction(@PathVariable("transactionId") UUID transactionId) {
        Transaction txn = txnRepo.findById(transactionId).orElse(null);
        List<AuditLog> logs = auditRepo.findByTransactionIdOrderByOccurredAtAsc(transactionId);
        List<OutboxEvent> outbox = outboxRepo.findByAggregateId(transactionId);
        return ResponseEntity.ok(new AuditTraceResponse(txn, logs, outbox));
    }

    @GetMapping("/logs")
    public ResponseEntity<List<AuditLog>> listLogs(@RequestParam(name = "transactionId", required = false) UUID transactionId) {
        if (transactionId != null) {
            return ResponseEntity.ok(auditRepo.findByTransactionIdOrderByOccurredAtAsc(transactionId));
        }
        return ResponseEntity.ok(auditRepo.findAll());
    }
}