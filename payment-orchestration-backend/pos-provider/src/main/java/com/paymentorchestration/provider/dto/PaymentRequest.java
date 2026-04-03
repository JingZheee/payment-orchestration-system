package com.paymentorchestration.provider.dto;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.PaymentMethod;
import com.paymentorchestration.common.enums.Region;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Getter
@Builder
public class PaymentRequest {

    private final UUID transactionId;
    private final String merchantOrderId;
    private final BigDecimal amount;
    private final Currency currency;
    private final Region region;
    private final PaymentMethod paymentMethod;
    private final String customerEmail;
    private final String description;
    private final String redirectUrl;
    private final Map<String, String> metadata;
}
