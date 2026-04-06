package com.paymentorchestration.payment.dto;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.PaymentMethod;
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

    @NotNull
    private PaymentMethod paymentMethod;

    @NotBlank
    @Email
    private String customerEmail;

    private String description;

    @NotBlank
    private String redirectUrl;
}
