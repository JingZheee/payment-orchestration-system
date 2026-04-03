package com.paymentorchestration.common.enums;

public enum UserRole {
    ADMIN,    // Full access — can configure providers, routing rules, re-queue DLQ
    VIEWER,   // Read-only access to dashboard and transactions
    MERCHANT  // Can initiate payments and view own transactions
}
