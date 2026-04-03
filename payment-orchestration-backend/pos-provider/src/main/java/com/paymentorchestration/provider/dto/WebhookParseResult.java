package com.paymentorchestration.provider.dto;

import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.Provider;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WebhookParseResult {

    private final Provider provider;
    private final String providerTransactionId;
    private final PaymentStatus status;
    private final String rawPayload;
}
