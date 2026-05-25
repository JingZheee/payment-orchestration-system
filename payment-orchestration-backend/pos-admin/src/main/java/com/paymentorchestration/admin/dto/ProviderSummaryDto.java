package com.paymentorchestration.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ProviderSummaryDto(
        String provider,
        String label,
        List<String> regions,
        String webhookType,
        boolean enabled,
        Instant updatedAt,
        BigDecimal successRate,
        Long avgLatencyMs,
        Integer transactionCount,
        List<String> supportedMethods
) {}
