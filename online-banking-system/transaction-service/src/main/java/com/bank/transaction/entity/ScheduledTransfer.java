package com.bank.transaction.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "scheduled_transfers")
@Getter
@Setter
public class ScheduledTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "from_account_id", nullable = false)
    private UUID fromAccountId;

    @Column(name = "to_account_id", nullable = false)
    private UUID toAccountId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String frequency; // DAILY, WEEKLY, MONTHLY, ONCE

    private String description;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE, PAUSED, CANCELLED, COMPLETED

    @Column(name = "next_execution_time", nullable = false)
    private Instant nextExecutionTime;

    @Column(name = "last_execution_time")
    private Instant lastExecutionTime;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}