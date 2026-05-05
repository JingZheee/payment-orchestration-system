package com.paymentorchestration.payment.controller;

import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import com.paymentorchestration.routing.strategy.ProviderRegionSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Returns available payment methods for a given transaction context.
 * The frontend calls this BEFORE showing the checkout page, so the user
 * can select their payment method. Routing then happens based on that selection.
 *
 * Pattern: "method selection first, route second" — same as Adyen, Stripe, Primer.io.
 */
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentMethodController {

    private final List<PaymentProviderPort> allProviders;

    public record AvailableMethod(
            String method,
            Provider provider,
            BigDecimal fee,
            String feeDescription
    ) {}

    @GetMapping("/methods")
    public ResponseEntity<ApiResponse<List<AvailableMethod>>> getAvailableMethods(
            @RequestParam Region region,
            @RequestParam BigDecimal amount) {

        List<AvailableMethod> result = new ArrayList<>();

        for (PaymentProviderPort provider : allProviders) {
            if (!provider.isAvailable()) continue;
            if (!ProviderRegionSupport.supportsRegion(provider.getProvider(), region)) continue;

            for (String method : provider.supportedMethods()) {
                BigDecimal fee = provider.calculateFee(amount, region, method);
                result.add(new AvailableMethod(
                        method,
                        provider.getProvider(),
                        fee,
                        describeFee(method, fee, amount)
                ));
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    private String describeFee(String method, BigDecimal fee, BigDecimal amount) {
        if ("FPX".equals(method) || "VIRTUAL_ACCOUNT".equals(method)) {
            return fee + " (fixed)";
        }
        return fee + " for amount " + amount;
    }
}
