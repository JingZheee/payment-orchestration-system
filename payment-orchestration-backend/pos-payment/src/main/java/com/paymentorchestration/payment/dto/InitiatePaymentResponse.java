package com.paymentorchestration.payment.dto;

import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.RoutingStrategy;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class InitiatePaymentResponse {

    private final UUID transactionId;
    private final String providerTransactionId;
    private final PaymentStatus status;
    private final Provider provider;
    private final RoutingStrategy routingStrategy;
    private final String routingReason;
    private final BigDecimal fee;
    /** Redirect URL returned by the provider — null for server-side flows. */
    private final String redirectUrl;
    private final Instant createdAt;
}
