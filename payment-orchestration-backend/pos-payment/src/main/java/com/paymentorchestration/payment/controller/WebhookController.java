package com.paymentorchestration.payment.controller;

import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.exception.WebhookVerificationException;
import com.paymentorchestration.payment.service.PaymentService;
import com.paymentorchestration.provider.dto.WebhookParseResult;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Receives inbound webhooks from payment providers.
 *
 * Endpoint: POST /api/v1/webhooks/{provider}
 *   e.g.  POST /api/v1/webhooks/BILLPLZ
 *         POST /api/v1/webhooks/MIDTRANS
 *         POST /api/v1/webhooks/PAYMONGO
 *         POST /api/v1/webhooks/MOCK
 *
 * This endpoint is intentionally PUBLIC (no JWT required) because providers
 * call it from their servers. Authenticity is verified via HMAC-SHA256 / RSA
 * signature checked by each provider adapter.
 *
 * Security note: even if signature verification fails we log the attempt and
 * return 200 to prevent provider retry storms; the transaction is NOT updated.
 */
@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final PaymentService paymentService;
    private final List<PaymentProviderPort> allProviders;

    private Map<Provider, PaymentProviderPort> providerMap;

    @PostConstruct
    void buildProviderMap() {
        providerMap = allProviders.stream()
                .collect(Collectors.toMap(PaymentProviderPort::getProvider, Function.identity()));
    }

    @PostMapping("/{provider}")
    public ResponseEntity<ApiResponse<Void>> handleWebhook(
            @PathVariable String provider,
            @RequestBody byte[] rawBody,
            @RequestHeader Map<String, String> headers) {

        Provider providerEnum;
        try {
            providerEnum = Provider.valueOf(provider.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("[webhook] unknown provider '{}' in path", provider);
            return ResponseEntity.ok(ApiResponse.ok(null, "Accepted"));
        }

        PaymentProviderPort adapter = providerMap.get(providerEnum);
        if (adapter == null) {
            log.warn("[webhook] no adapter registered for provider {}", providerEnum);
            return ResponseEntity.ok(ApiResponse.ok(null, "Accepted"));
        }

        boolean signatureValid = adapter.verifyWebhookSignature(rawBody, headers);
        if (!signatureValid) {
            log.warn("[webhook] invalid signature from provider {}", providerEnum);
            // Still parse and log, but PaymentService will not update the transaction
        }

        String rawBodyStr = new String(rawBody, java.nio.charset.StandardCharsets.UTF_8);
        WebhookParseResult parsed = adapter.parseWebhookPayload(rawBodyStr);

        paymentService.handleWebhook(parsed, signatureValid);

        log.info("[webhook] processed provider={} txn={} status={} signatureValid={}",
                providerEnum, parsed.getProviderTransactionId(), parsed.getStatus(), signatureValid);

        return ResponseEntity.ok(ApiResponse.ok(null, "Webhook processed"));
    }
}
