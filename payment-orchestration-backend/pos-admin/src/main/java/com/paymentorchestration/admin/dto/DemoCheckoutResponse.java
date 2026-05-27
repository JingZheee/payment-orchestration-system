package com.paymentorchestration.admin.dto;

import java.util.UUID;

public record DemoCheckoutResponse(
        UUID policyId,
        UUID transactionId,
        String redirectUrl,
        String vaNumber
) {}
