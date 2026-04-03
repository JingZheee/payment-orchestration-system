package com.paymentorchestration.common.enums;

public enum PaymentStatus {
    PENDING,
    PROCESSING,
    SUCCESS,
    FAILED,
    RETRY_EXHAUSTED,
    REFUNDED,
    CANCELLED
}
