package com.paymentorchestration.payment.dto;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentSucceededEvent {

    private UUID transactionId;
    private String merchantOrderId;
    private BigDecimal amount;
    private Currency currency;
    private Region region;
    private Provider provider;
    private PaymentType paymentType;
    private String policyNumber;
    private String claimReference;
    private Instant succeededAt;
}
