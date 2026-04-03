package com.paymentorchestration.common.enums;

public enum RoutingStrategy {
    REGION_BASED,    // First eligible provider for the region
    SUCCESS_RATE,    // Provider with highest historical success rate
    LOWEST_FEE,      // Provider with lowest fee for the transaction amount
    COMPOSITE_SCORE  // Weighted score: success_rate(50%) + fee(30%) + latency(20%)
}
