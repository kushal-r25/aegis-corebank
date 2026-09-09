package com.bank.common.dto.request;

import jakarta.validation.constraints.NotBlank;

public record OtpVerifyRequest(@NotBlank String otpSessionId, @NotBlank String code) {}
