package com.bank.account.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "beneficiaries", uniqueConstraints = @UniqueConstraint(columnNames = {"owner_account_id", "beneficiary_account"}))
@Getter
@Setter
public class Beneficiary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "owner_account_id", nullable = false)
    private UUID ownerAccountId;

    @Column(name = "beneficiary_account", nullable = false)
    private String beneficiaryAccount;

    private String nickname;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE, BLOCKED

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
