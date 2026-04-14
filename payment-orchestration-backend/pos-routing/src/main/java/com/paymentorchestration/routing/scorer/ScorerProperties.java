package com.paymentorchestration.routing.scorer;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Binding for routing.scorer.* in application.yml.
 *
 * Weights must sum to 1.0:
 *   successRateWeight (0.40) + feeWeight (0.25) + latencyWeight (0.15) + feeAccuracyWeight (0.20)
 */
@Component
@ConfigurationProperties(prefix = "routing.scorer")
@Getter
@Setter
public class ScorerProperties {

    /** Weight applied to the provider's historical success rate (default 40%). */
    private double successRateWeight = 0.40;

    /** Weight applied to the volume-weighted normalized fee component (default 25%). */
    private double feeWeight = 0.25;

    /** Weight applied to the normalized latency component (default 15%). */
    private double latencyWeight = 0.15;

    /** Weight applied to the provider's fee accuracy from reconciliation (default 20%). */
    private double feeAccuracyWeight = 0.20;
}
