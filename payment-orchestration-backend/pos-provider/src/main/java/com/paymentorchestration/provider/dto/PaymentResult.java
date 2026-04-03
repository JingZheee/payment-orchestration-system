package com.paymentorchestration.provider.dto;

import com.paymentorchestration.common.enums.PaymentStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PaymentResult {

    private final String providerTransactionId;
    private final PaymentStatus status;
    private final String redirectUrl;
    private final BigDecimal fee;
    /** Raw JSON response from the provider — stored in transaction_events for debugging. */
    private final String rawResponse;
}
