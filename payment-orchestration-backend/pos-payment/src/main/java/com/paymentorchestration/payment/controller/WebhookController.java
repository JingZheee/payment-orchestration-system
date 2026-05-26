package com.paymentorchestration.payment.controller;

import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.payment.dto.WebhookMessage;
import com.paymentorchestration.payment.messaging.WebhookPublisher;
import com.paymentorchestration.provider.dto.WebhookParseResult;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Receives inbound webhooks from payment providers.
 *
 * Endpoint: POST /api/v1/webhooks/{provider}
 *
 * This endpoint is intentionally PUBLIC (no JWT required) because providers
 * call it from their servers. Authenticity is verified via HMAC-SHA256 / RSA
 * signature checked by each provider adapter.
 *
 * Fast-ack pattern: signature verification and parsing happen inline (cheap),
 * then the parsed event is published to webhook.queue and 200 is returned
 * immediately. WebhookConsumer owns the DB work asynchronously.
 *
 * Security note: even if signature verification fails we log the attempt and
 * return 200 to prevent provider retry storms; the transaction is NOT updated.
 */
@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final List<PaymentProviderPort> allProviders;
    private final WebhookPublisher webhookPublisher;

    private Map<Provider, PaymentProviderPort> providerMap;

    @PostConstruct
    void buildProviderMap() {
        providerMap = allProviders.stream()
                .collect(Collectors.toMap(PaymentProviderPort::getProvider, Function.identity()));
    }

    @PostMapping("/{provider}")
    public ResponseEntity<ApiResponse<Void>> handleWebhook(
            @PathVariable("provider") String provider,
            HttpServletRequest request) {

        Map<String, String> formParams = new LinkedHashMap<>();
        byte[] rawBody;
        String contentType = request.getContentType() != null ? request.getContentType() : "";
        if (contentType.contains("application/x-www-form-urlencoded")) {
            request.getParameterMap().forEach((k, v) -> formParams.put(k, v.length > 0 ? v[0] : ""));
            rawBody = new byte[0];
        } else {
            try {
                rawBody = request.getInputStream().readAllBytes();
            } catch (IOException e) {
                log.error("[webhook] failed to read request body", e);
                rawBody = new byte[0];
            }
        }

        Map<String, String> headers = new HashMap<>();
        Enumeration<String> headerNames = request.getHeaderNames();
        if (headerNames != null) {
            while (headerNames.hasMoreElements()) {
                String name = headerNames.nextElement();
                headers.put(name.toLowerCase(Locale.ROOT), request.getHeader(name));
            }
        }

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

        boolean signatureValid = adapter.verifyWebhookSignature(rawBody, headers, formParams);
        if (!signatureValid) {
            log.warn("[webhook] invalid signature from provider {}", providerEnum);
        }

        WebhookParseResult parsed = formParams.isEmpty()
                ? adapter.parseWebhookPayload(new String(rawBody, StandardCharsets.UTF_8))
                : adapter.parseWebhookPayload(formParams);

        WebhookMessage message = WebhookMessage.builder()
                .provider(parsed.getProvider())
                .providerTransactionId(parsed.getProviderTransactionId())
                .status(parsed.getStatus())
                .rawPayload(parsed.getRawPayload())
                .signatureValid(signatureValid)
                .receivedAt(Instant.now())
                .build();

        webhookPublisher.publish(message);

        log.info("[webhook] accepted provider={} txn={} signatureValid={} — queued for async processing",
                providerEnum, parsed.getProviderTransactionId(), signatureValid);

        return ResponseEntity.ok(ApiResponse.ok(null, "Accepted"));
    }
}
