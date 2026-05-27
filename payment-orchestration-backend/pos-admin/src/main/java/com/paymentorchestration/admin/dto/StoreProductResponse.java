package com.paymentorchestration.admin.dto;

import com.paymentorchestration.domain.entity.StoreProduct;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public record StoreProductResponse(
        UUID id,
        String code,
        String name,
        String insuranceType,
        String tagline,
        BigDecimal amount,
        String billingPeriod,
        List<String> features,
        String badge,
        String region,
        String currency
) {
    public static StoreProductResponse from(StoreProduct p) {
        return new StoreProductResponse(
                p.getId(),
                p.getCode(),
                p.getName(),
                p.getInsuranceType(),
                p.getTagline(),
                p.getAmount(),
                p.getBillingPeriod(),
                Arrays.stream(p.getFeatures().split("\\|"))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList(),
                p.getBadge(),
                p.getRegion(),
                p.getCurrency()
        );
    }
}
