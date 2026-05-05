package com.paymentorchestration.payment.dto;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.common.enums.Region;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InitiatePaymentRequest {

    @NotBlank
    private String merchantOrderId;

    @NotNull
    @DecimalMin(value = "0.01")
    @Digits(integer = 15, fraction = 4)
    private BigDecimal amount;

    @NotNull
    private Currency currency;

    @NotNull
    private Region region;

    @NotBlank
    private String paymentMethod;

    @NotBlank
    @Email
    private String customerEmail;

    private String description;

    @NotBlank
    private String redirectUrl;

    /** Insurance payment classification. Defaults to PREMIUM_COLLECTION when not provided. */
    private PaymentType paymentType;

    private String policyNumber;

    private String claimReference;
}
