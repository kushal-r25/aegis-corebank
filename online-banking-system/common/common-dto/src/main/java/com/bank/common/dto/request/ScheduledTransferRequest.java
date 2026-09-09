package com.bank.common.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ScheduledTransferRequest(
        @NotNull UUID userId,
        @NotNull UUID fromAccountId,
        @NotNull UUID toAccountId,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotBlank String frequency,
        String description,
        Instant startDate
) {}