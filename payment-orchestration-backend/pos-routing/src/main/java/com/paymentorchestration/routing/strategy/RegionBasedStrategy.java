package com.paymentorchestration.routing.strategy;

import com.paymentorchestration.routing.dto.RoutingContext;
import com.paymentorchestration.routing.dto.RoutingDecision;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Selects the first available provider that supports the requested region.
 *
 * This is the simplest strategy — no scoring, just availability and region match.
 * Useful as a fast fallback or when cost/quality metrics aren't critical.
 */
@Component
public class RegionBasedStrategy implements RoutingStrategy {

    @Override
    public com.paymentorchestration.common.enums.RoutingStrategy getType() {
        return com.paymentorchestration.common.enums.RoutingStrategy.REGION_BASED;
    }

    @Override
    public Optional<RoutingDecision> select(RoutingContext context) {
        return context.getAvailableProviders().stream()
                .filter(p -> ProviderRegionSupport.supportsRegion(p.getProvider(), context.getRegion()))
                .findFirst()
                .map(p -> RoutingDecision.builder()
                        .provider(p.getProvider())
                        .strategy(com.paymentorchestration.common.enums.RoutingStrategy.REGION_BASED)
                        .reason("Region-based: first available provider for region " + context.getRegion()
                                + " → " + p.getProvider())
                        .build());
    }
}
