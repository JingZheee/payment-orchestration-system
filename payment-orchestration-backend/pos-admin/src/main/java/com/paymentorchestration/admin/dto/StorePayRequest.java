package com.paymentorchestration.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record StorePayRequest(
        @NotNull UUID policyId,
        @NotBlank String redirectUrl,
        @NotBlank String paymentMethod,
        String bankCode
) {}
