package com.paymentorchestration.admin.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record DemoCheckoutRequest(
        @NotBlank String holderName,
        @NotBlank @Email String holderEmail,
        @NotBlank String insuranceType,
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        @NotBlank String paymentMethod,
        @NotBlank String redirectUrl,
        @NotBlank String region,
        @NotBlank String currency
) {}
