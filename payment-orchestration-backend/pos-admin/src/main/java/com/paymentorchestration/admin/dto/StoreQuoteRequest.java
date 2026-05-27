package com.paymentorchestration.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record StoreQuoteRequest(
        @NotBlank String holderName,
        @NotBlank String holderEmail,
        @NotBlank String insuranceType,
        @NotNull @Positive BigDecimal amount,
        @NotBlank String paymentMethod,
        @NotBlank String region,
        @NotBlank String currency,
        @NotBlank String appBaseUrl
) {}
