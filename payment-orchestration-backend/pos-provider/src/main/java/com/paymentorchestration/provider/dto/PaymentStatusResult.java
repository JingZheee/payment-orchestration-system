package com.paymentorchestration.provider.dto;

import com.paymentorchestration.common.enums.PaymentStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PaymentStatusResult {

    private final String providerTransactionId;
    private final PaymentStatus status;
    private final String rawResponse;
}
