package com.paymentorchestration.common.enums;

public enum MockProviderMode {
    ALWAYS_SUCCESS,  // All payments succeed immediately
    ALWAYS_FAIL,     // All payments fail — triggers failover demo
    RANDOM,          // Configurable % success rate
    DELAYED          // Succeeds after N seconds — tests timeout/retry handling
}
