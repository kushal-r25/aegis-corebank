package com.bank.transaction.repository;

import com.bank.transaction.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    java.util.List<AuditLog> findByTransactionIdOrderByOccurredAtAsc(UUID transactionId);
}
