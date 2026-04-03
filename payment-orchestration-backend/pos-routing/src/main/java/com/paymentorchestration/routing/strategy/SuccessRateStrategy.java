package com.paymentorchestration.routing.strategy;

import com.paymentorchestration.domain.entity.ProviderMetrics;
import com.paymentorchestration.domain.repository.ProviderMetricsRepository;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import com.paymentorchestration.routing.dto.RoutingContext;
import com.paymentorchestration.routing.dto.RoutingDecision;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.Optional;

/**
 * Selects the provider with the highest historical success rate for the
 * requested region, based on the most recent ProviderMetrics window.
 *
 * Falls back to 0.0 success rate for providers with no recorded metrics,
 * so a provider with real data will always be preferred.
 */
@Component
@RequiredArgsConstructor
public class SuccessRateStrategy implements RoutingStrategy {

    private final ProviderMetricsRepository metricsRepository;

    @Override
    public com.paymentorchestration.common.enums.RoutingStrategy getType() {
        return com.paymentorchestration.common.enums.RoutingStrategy.SUCCESS_RATE;
    }

    @Override
    public Optional<RoutingDecision> select(RoutingContext context) {
        return context.getAvailableProviders().stream()
                .filter(p -> ProviderRegionSupport.supportsRegion(p.getProvider(), context.getRegion()))
                .max(Comparator.comparing(p -> latestSuccessRate(p, context)))
                .map(p -> {
                    BigDecimal rate = latestSuccessRate(p, context);
                    return RoutingDecision.builder()
                            .provider(p.getProvider())
                            .strategy(com.paymentorchestration.common.enums.RoutingStrategy.SUCCESS_RATE)
                            .reason("Success-rate: " + p.getProvider() + " has highest rate "
                                    + rate + " in region " + context.getRegion())
                            .build();
                });
    }

    private BigDecimal latestSuccessRate(PaymentProviderPort provider, RoutingContext context) {
        return metricsRepository
                .findTopByProviderAndRegionOrderByWindowEndDesc(provider.getProvider(), context.getRegion())
                .map(ProviderMetrics::getSuccessRate)
                .orElse(BigDecimal.ZERO);
    }
}
