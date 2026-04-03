package com.paymentorchestration.provider.dto;

import com.paymentorchestration.common.enums.PaymentStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class RefundResult {

    private final String providerRefundId;
    private final PaymentStatus status;
    private final BigDecimal amount;
    private final String rawResponse;
}
