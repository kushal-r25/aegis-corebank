package com.bank.transaction.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fraud_records")
@Getter
@Setter
public class FraudRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "transaction_id", nullable = false)
    private UUID transactionId;

    @Column(name = "from_account_id", nullable = false)
    private UUID fromAccountId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(name = "risk_level", nullable = false)
    private String riskLevel; // REVIEW, BLOCKED

    @Column(name = "risk_reason", nullable = false)
    private String riskReason;

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}