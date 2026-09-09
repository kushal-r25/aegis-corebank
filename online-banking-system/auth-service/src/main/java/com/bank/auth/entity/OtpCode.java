package com.bank.auth.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "otp_codes")
@Getter
@Setter
public class OtpCode {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    /** LOGIN, TRANSFER_CONFIRM */
    @Column(nullable = false)
    private String purpose;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    private boolean used = false;

    private int attempts = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
