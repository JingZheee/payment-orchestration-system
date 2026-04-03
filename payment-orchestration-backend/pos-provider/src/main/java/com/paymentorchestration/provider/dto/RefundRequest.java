package com.paymentorchestration.provider.dto;

import com.paymentorchestration.common.enums.Currency;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Builder
public class RefundRequest {

    private final UUID transactionId;
    private final String providerTransactionId;
    private final BigDecimal amount;
    private final Currency currency;
    private final String reason;
}
