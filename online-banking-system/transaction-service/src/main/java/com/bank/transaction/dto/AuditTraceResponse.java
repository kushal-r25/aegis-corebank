package com.bank.transaction.dto;

import com.bank.transaction.entity.AuditLog;
import com.bank.transaction.entity.OutboxEvent;
import com.bank.transaction.entity.Transaction;

import java.util.List;

public record AuditTraceResponse(
        Transaction transaction,
        List<AuditLog> auditLogs,
        List<OutboxEvent> outboxEvents
) {}