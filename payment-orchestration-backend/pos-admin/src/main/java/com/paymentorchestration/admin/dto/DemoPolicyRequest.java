package com.paymentorchestration.admin.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record DemoPolicyRequest(
        @NotBlank String holderName,
        @NotBlank @Email String holderEmail,
        @NotBlank String insuranceType,
        String policyNumber,
        String claimReference,
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        @NotBlank String currency,
        @NotBlank String region,
        @NotBlank String paymentMethod,
        @NotBlank String paymentType
) {}
