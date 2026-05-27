package com.paymentorchestration.admin.dto;

import java.util.UUID;

public record StoreQuoteResponse(
        UUID policyId,
        String quoteReference,
        String message
) {}
