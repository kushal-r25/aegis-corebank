package com.bank.account.dto;

import java.time.Instant;
import java.util.UUID;

public record BeneficiaryResponse(UUID id, String beneficiaryAccount, String nickname, String status, Instant createdAt) {}

