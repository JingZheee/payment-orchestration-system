package com.paymentorchestration.admin.dto;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record RoutingRuleRequest(
        @Min(1) int priority,
        Region region,
        Currency currency,
        BigDecimal minAmount,
        BigDecimal maxAmount,
        @NotNull Provider preferredProvider,
        boolean enabled
) {}
