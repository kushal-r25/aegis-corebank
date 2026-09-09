package com.bank.common.dto.request;

import jakarta.validation.constraints.NotBlank;

public record AddBeneficiaryRequest(
        @NotBlank String beneficiaryAccountNumber,
        String nickname
) {}
