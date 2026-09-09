package com.bank.account.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ledger_entries")
@Getter
@Setter
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(name = "entry_type", nullable = false)
    private String entryType; // DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT, REVERSAL_DEBIT, REVERSAL_CREDIT

    @Column(name = "balance_after", nullable = false)
    private BigDecimal balanceAfter;

    @Column(name = "reference_id")
    private String referenceId;

    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}