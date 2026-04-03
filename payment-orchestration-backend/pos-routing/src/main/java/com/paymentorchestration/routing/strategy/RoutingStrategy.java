package com.paymentorchestration.routing.strategy;

import com.paymentorchestration.routing.dto.RoutingContext;
import com.paymentorchestration.routing.dto.RoutingDecision;

import java.util.Optional;

/**
 * Strategy pattern contract for provider selection algorithms.
 *
 * Each implementation selects the best provider from the available set
 * using a different criterion (region, success rate, fee, or composite score).
 *
 * Note: the return type of getType() uses the fully-qualified enum name to avoid
 * a naming conflict with this interface in files that import both.
 */
public interface RoutingStrategy {

    /** Returns the enum constant that identifies this strategy. */
    com.paymentorchestration.common.enums.RoutingStrategy getType();

    /**
     * Select the best provider for the given context.
     * Returns empty if no eligible provider is found (e.g., no available provider
     * supports the requested region).
     */
    Optional<RoutingDecision> select(RoutingContext context);
}
