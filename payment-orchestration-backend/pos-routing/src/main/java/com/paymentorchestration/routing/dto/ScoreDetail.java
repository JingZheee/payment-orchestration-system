package com.paymentorchestration.routing.dto;

import com.paymentorchestration.common.enums.Provider;

import java.math.BigDecimal;

/**
 * Full breakdown of a provider's composite score for a given routing context.
 * Returned by ProviderScorer.scoreDetail() and exposed via the admin dashboard API.
 */
public record ScoreDetail(
        Provider provider,
        BigDecimal totalScore,

        // Raw inputs
        BigDecimal successRate,
        BigDecimal rawFee,
        long latencyMs,
        BigDecimal feeAccuracy,

        // Weighted components (sum = totalScore)
        BigDecimal srComponent,
        BigDecimal feeComponent,
        BigDecimal latencyComponent,
        BigDecimal accuracyComponent
) {}
