package com.paymentorchestration.routing.scorer;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.domain.entity.ProviderMetrics;
import com.paymentorchestration.domain.repository.ProviderMetricsRepository;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import com.paymentorchestration.routing.dto.RoutingContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Computes a composite score in [0, 1] for each provider.
 *
 * Formula (from application.yml weights):
 *   score = (successRate × srWeight)
 *         + ((1 - normalizedFee) × feeWeight)
 *         + ((1 - normalizedLatency) × latencyWeight)
 *
 * Normalization divides each metric by the maximum across eligible providers,
 * so scores are relative rather than absolute.
 *
 * Default values when no historical data exists:
 *   - successRate  → 0.5   (neutral, avoids unfairly penalising new providers)
 *   - avgLatencyMs → 500ms (conservative estimate)
 */
@Component
@RequiredArgsConstructor
public class ProviderScorer {

    private final ProviderMetricsRepository metricsRepository;
    private final ScorerProperties properties;

    /**
     * Score a single provider relative to all eligible providers.
     *
     * @param provider         the provider to score
     * @param context          routing context (amount, region, …)
     * @param eligibleProviders all providers competing in this routing decision
     * @return composite score in [0, 1] — higher is better
     */
    public BigDecimal score(PaymentProviderPort provider,
                            RoutingContext context,
                            List<PaymentProviderPort> eligibleProviders) {

        Region region = context.getRegion();
        BigDecimal amount = context.getAmount();

        // --- success rate component ---
        BigDecimal successRate = latestSuccessRate(provider.getProvider(), region);

        // --- fee component ---
        BigDecimal fee = provider.calculateFee(amount);
        BigDecimal maxFee = eligibleProviders.stream()
                .map(p -> p.calculateFee(amount))
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ONE);
        BigDecimal normalizedFee = maxFee.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : fee.divide(maxFee, 6, RoundingMode.HALF_UP);

        // --- latency component ---
        long latencyMs = latestAvgLatencyMs(provider.getProvider(), region);
        long maxLatencyMs = eligibleProviders.stream()
                .mapToLong(p -> latestAvgLatencyMs(p.getProvider(), region))
                .max()
                .orElse(1L);
        BigDecimal normalizedLatency = maxLatencyMs == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(latencyMs).divide(BigDecimal.valueOf(maxLatencyMs), 6, RoundingMode.HALF_UP);

        // --- composite ---
        BigDecimal srComponent      = successRate.multiply(BigDecimal.valueOf(properties.getSuccessRateWeight()));
        BigDecimal feeComponent     = BigDecimal.ONE.subtract(normalizedFee)
                                                    .multiply(BigDecimal.valueOf(properties.getFeeWeight()));
        BigDecimal latencyComponent = BigDecimal.ONE.subtract(normalizedLatency)
                                                    .multiply(BigDecimal.valueOf(properties.getLatencyWeight()));

        return srComponent.add(feeComponent).add(latencyComponent).setScale(6, RoundingMode.HALF_UP);
    }

    private BigDecimal latestSuccessRate(Provider provider, Region region) {
        return metricsRepository
                .findTopByProviderAndRegionOrderByWindowEndDesc(provider, region)
                .map(ProviderMetrics::getSuccessRate)
                .orElse(new BigDecimal("0.5")); // neutral default — no data yet
    }

    private long latestAvgLatencyMs(Provider provider, Region region) {
        return metricsRepository
                .findTopByProviderAndRegionOrderByWindowEndDesc(provider, region)
                .map(ProviderMetrics::getAvgLatencyMs)
                .orElse(500L); // conservative default — no data yet
    }
}
