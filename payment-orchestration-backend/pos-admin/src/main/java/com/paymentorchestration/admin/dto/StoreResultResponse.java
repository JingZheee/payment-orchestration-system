package com.paymentorchestration.admin.dto;

import com.paymentorchestration.domain.entity.DemoPolicy;
import com.paymentorchestration.domain.entity.Transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record StoreResultResponse(
        UUID transactionId,
        String status,
        String provider,
        String routingStrategy,
        String routingReason,
        BigDecimal fee,
        BigDecimal amount,
        String currency,
        String policyNumber,
        String holderName,
        String holderEmail,
        String insuranceType,
        String paymentMethod,
        String region,
        Instant createdAt
) {
    public static StoreResultResponse from(Transaction t, DemoPolicy policy) {
        return new StoreResultResponse(
                t.getId(),
                t.getStatus() != null ? t.getStatus().name() : "UNKNOWN",
                t.getProvider() != null ? t.getProvider().name() : "UNKNOWN",
                t.getRoutingStrategy() != null ? t.getRoutingStrategy().name() : null,
                t.getRoutingReason(),
                t.getFee(),
                t.getAmount(),
                t.getCurrency() != null ? t.getCurrency().name() : "MYR",
                policy != null ? policy.getPolicyNumber() : t.getPolicyNumber(),
                policy != null ? policy.getHolderName() : null,
                policy != null ? policy.getHolderEmail() : t.getCustomerEmail(),
                policy != null ? policy.getInsuranceType() : null,
                policy != null ? policy.getPaymentMethod() : null,
                policy != null ? policy.getRegion() : (t.getRegion() != null ? t.getRegion().name() : null),
                t.getCreatedAt()
        );
    }

    /** Used when a quote exists but payment has not yet been initiated. */
    public static StoreResultResponse fromQuote(DemoPolicy policy) {
        return new StoreResultResponse(
                null,
                "QUOTE",
                null,
                null,
                null,
                null,
                policy.getAmount(),
                policy.getCurrency(),
                policy.getPolicyNumber(),
                policy.getHolderName(),
                policy.getHolderEmail(),
                policy.getInsuranceType(),
                null,
                policy.getRegion(),
                policy.getCreatedAt()
        );
    }
}
