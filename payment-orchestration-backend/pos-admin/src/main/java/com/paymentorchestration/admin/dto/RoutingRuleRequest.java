package com.paymentorchestration.admin.dto;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.common.enums.RoutingStrategy;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

/**
 * Either preferredProvider OR strategy must be set — not both, not neither.
 */
public record RoutingRuleRequest(
        @Min(1) int priority,
        Region region,
        Currency currency,
        BigDecimal minAmount,
        BigDecimal maxAmount,
        Provider preferredProvider,
        RoutingStrategy strategy,
        boolean enabled,
        PaymentType paymentType
) {
    @AssertTrue(message = "Exactly one of preferredProvider or strategy must be set")
    boolean isValid() {
        return (preferredProvider != null) ^ (strategy != null);
    }
}
