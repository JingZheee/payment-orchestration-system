package com.paymentorchestration.routing.scorer;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.domain.entity.ProviderMetrics;
import com.paymentorchestration.domain.repository.ProviderFeeRateRepository;
import com.paymentorchestration.domain.repository.ProviderMetricsRepository;
import com.paymentorchestration.domain.repository.ReconStatementRepository;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import com.paymentorchestration.routing.dto.RoutingContext;
import com.paymentorchestration.routing.dto.ScoreDetail;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Computes a composite score in [0, 1] for each provider.
 *
 * Formula (weights from application.yml):
 *   score = (successRate        × srWeight)
 *         + ((1 - normFee)      × feeWeight)         ← volume-weighted avg fee from recon history
 *         + ((1 - normLatency)  × latencyWeight)
 *         + (feeAccuracy        × feeAccuracyWeight)  ← from provider_metrics reconciliation data
 *
 * Volume-weighted fee:
 *   Uses recon_statements to find real payment method distribution per provider.
 *   Weighted avg fee = sum(fee_for_method × share_of_method_in_history)
 *   Falls back to default method fee when no recon history exists.
 *
 * Defaults when no historical data:
 *   successRate    → 0.5   (neutral)
 *   avgLatencyMs   → 500ms (conservative)
 *   feeAccuracy    → 1.0   (assume honest until proven otherwise)
 */
@Component
@RequiredArgsConstructor
public class ProviderScorer {

    private final ProviderMetricsRepository metricsRepository;
    private final ReconStatementRepository reconRepository;
    private final ProviderFeeRateRepository feeRateRepository;
    private final ScorerProperties properties;

    public BigDecimal score(PaymentProviderPort provider,
                            RoutingContext context,
                            List<PaymentProviderPort> eligibleProviders) {
        return scoreDetail(provider, context, eligibleProviders).totalScore();
    }

    /**
     * Full score breakdown for a single provider.
     * Returns all raw inputs and weighted components so the admin dashboard
     * can display a per-provider score explanation.
     */
    public ScoreDetail scoreDetail(PaymentProviderPort provider,
                                   RoutingContext context,
                                   List<PaymentProviderPort> eligibleProviders) {

        Region region = context.getRegion();
        BigDecimal amount = context.getAmount();

        // --- success rate ---
        BigDecimal successRate = latestSuccessRate(provider.getProvider(), region);

        // --- volume-weighted fee ---
        BigDecimal fee = volumeWeightedFee(provider.getProvider(), context, amount);
        BigDecimal maxFee = eligibleProviders.stream()
                .map(p -> volumeWeightedFee(p.getProvider(), context, amount))
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ONE);
        BigDecimal normalizedFee = maxFee.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : fee.divide(maxFee, 6, RoundingMode.HALF_UP);

        // --- latency ---
        long latencyMs = latestAvgLatencyMs(provider.getProvider(), region);
        long maxLatencyMs = eligibleProviders.stream()
                .mapToLong(p -> latestAvgLatencyMs(p.getProvider(), region))
                .max()
                .orElse(1L);
        BigDecimal normalizedLatency = maxLatencyMs == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(latencyMs).divide(BigDecimal.valueOf(maxLatencyMs), 6, RoundingMode.HALF_UP);

        // --- fee accuracy ---
        BigDecimal feeAccuracy = latestFeeAccuracyRate(provider.getProvider(), region);

        // --- weighted components ---
        BigDecimal srComponent       = successRate.multiply(BigDecimal.valueOf(properties.getSuccessRateWeight()));
        BigDecimal feeComponent      = BigDecimal.ONE.subtract(normalizedFee)
                                                     .multiply(BigDecimal.valueOf(properties.getFeeWeight()));
        BigDecimal latencyComponent  = BigDecimal.ONE.subtract(normalizedLatency)
                                                     .multiply(BigDecimal.valueOf(properties.getLatencyWeight()));
        BigDecimal accuracyComponent = feeAccuracy.multiply(BigDecimal.valueOf(properties.getFeeAccuracyWeight()));

        BigDecimal totalScore = srComponent.add(feeComponent).add(latencyComponent).add(accuracyComponent)
                                           .setScale(6, RoundingMode.HALF_UP);

        return new ScoreDetail(
                provider.getProvider(),
                totalScore,
                successRate,
                fee,
                latencyMs,
                feeAccuracy,
                srComponent.setScale(6, RoundingMode.HALF_UP),
                feeComponent.setScale(6, RoundingMode.HALF_UP),
                latencyComponent.setScale(6, RoundingMode.HALF_UP),
                accuracyComponent.setScale(6, RoundingMode.HALF_UP)
        );
    }

    /**
     * Volume-weighted average fee for a provider, scoped to the transaction's region.
     *
     * Uses recon_statements filtered by (provider, region) to find the real payment method
     * distribution, then weights fee rates accordingly. This ensures MOCK's MY history
     * doesn't contaminate its ID or PH fee estimates.
     *
     * If no recon data exists for the region, falls back to the fee rate for the
     * context's payment method from provider_fee_rates.
     */
    private BigDecimal volumeWeightedFee(Provider provider, RoutingContext context, BigDecimal amount) {
        Region region = context.getRegion();
        List<Object[]> methodCounts = reconRepository.countByPaymentMethodForProviderAndRegion(provider, region);

        if (methodCounts.isEmpty()) {
            // No recon history for this region — use the context's payment method as a stand-in
            return feeRateRepository
                    .findByProviderAndRegionAndPaymentMethodAndActiveTrue(provider, region, context.getPaymentMethod())
                    .map(rate -> rate.compute(amount))
                    .orElse(BigDecimal.ZERO);
        }

        long total = methodCounts.stream().mapToLong(row -> (Long) row[1]).sum();
        if (total == 0) return BigDecimal.ZERO;

        BigDecimal weightedFee = BigDecimal.ZERO;
        for (Object[] row : methodCounts) {
            String method = (String) row[0];
            long count = (Long) row[1];
            BigDecimal share = BigDecimal.valueOf(count).divide(BigDecimal.valueOf(total), 6, RoundingMode.HALF_UP);

            BigDecimal methodFee = feeRateRepository
                    .findByProviderAndRegionAndPaymentMethodAndActiveTrue(provider, region, method)
                    .map(rate -> rate.compute(amount))
                    .orElse(BigDecimal.ZERO);

            weightedFee = weightedFee.add(methodFee.multiply(share));
        }
        return weightedFee.setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal latestSuccessRate(Provider provider, Region region) {
        return metricsRepository
                .findTopByProviderAndRegionOrderByWindowEndDesc(provider, region)
                .map(ProviderMetrics::getSuccessRate)
                .orElse(new BigDecimal("0.5"));
    }

    private long latestAvgLatencyMs(Provider provider, Region region) {
        return metricsRepository
                .findTopByProviderAndRegionOrderByWindowEndDesc(provider, region)
                .map(ProviderMetrics::getAvgLatencyMs)
                .orElse(500L);
    }

    private BigDecimal latestFeeAccuracyRate(Provider provider, Region region) {
        return metricsRepository
                .findTopByProviderAndRegionOrderByWindowEndDesc(provider, region)
                .map(ProviderMetrics::getFeeAccuracyRate)
                .orElse(BigDecimal.ONE);
    }
}
