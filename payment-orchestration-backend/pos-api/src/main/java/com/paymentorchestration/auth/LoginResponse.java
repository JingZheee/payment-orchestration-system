package com.paymentorchestration.auth;

import com.paymentorchestration.common.enums.UserRole;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        UserRole role
) {}
