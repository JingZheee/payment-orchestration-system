package com.paymentorchestration.payment.dto;

import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.Provider;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookMessage {
    private Provider provider;
    private String providerTransactionId;
    private PaymentStatus status;
    private String rawPayload;
    private boolean signatureValid;
    private Instant receivedAt;
}
