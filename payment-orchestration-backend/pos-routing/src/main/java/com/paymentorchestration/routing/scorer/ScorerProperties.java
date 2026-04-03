package com.paymentorchestration.routing.scorer;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Binding for routing.scorer.* in application.yml.
 *
 * Weights must sum to 1.0:
 *   successRateWeight (0.50) + feeWeight (0.30) + latencyWeight (0.20)
 */
@Component
@ConfigurationProperties(prefix = "routing.scorer")
@Getter
@Setter
public class ScorerProperties {

    /** Weight applied to the provider's historical success rate (default 50%). */
    private double successRateWeight = 0.50;

    /** Weight applied to the normalized fee component (default 30%). */
    private double feeWeight = 0.30;

    /** Weight applied to the normalized latency component (default 20%). */
    private double latencyWeight = 0.20;
}
