package com.paymentorchestration.routing.dto;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.RoutingStrategy;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * The result of the routing engine's provider selection.
 * Written to Transaction.routingReason and logged to transaction_events.
 */
@Getter
@Builder
public class RoutingDecision {

    /** The selected payment provider. */
    private final Provider provider;

    /** Which strategy produced this decision. */
    private final RoutingStrategy strategy;

    /** Human-readable reason stored in the transactions table. */
    private final String reason;

    /** Composite score — populated only when strategy == COMPOSITE_SCORE, null otherwise. */
    private final BigDecimal score;
}
