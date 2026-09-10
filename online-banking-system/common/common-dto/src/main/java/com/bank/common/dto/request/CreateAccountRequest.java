package com.bank.common.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateAccountRequest(
        @NotNull UUID userId,
        @NotBlank String accountType,
        String currency
) {
    public CreateAccountRequest(@NotNull UUID userId, @NotBlank String accountType) {
        this(userId, accountType, "USD");
    }
}
