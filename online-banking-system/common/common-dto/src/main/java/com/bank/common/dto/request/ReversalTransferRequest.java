package com.bank.common.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record ReversalTransferRequest(
        @NotNull UUID debitedAccountId,
        @NotNull UUID creditedAccountId,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        String referenceId
) {}