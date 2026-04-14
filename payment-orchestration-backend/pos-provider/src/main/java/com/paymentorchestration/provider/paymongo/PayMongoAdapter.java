package com.paymentorchestration.provider.paymongo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paymentorchestration.common.enums.PaymentMethod;
import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.exception.ProviderException;
import com.paymentorchestration.domain.entity.ProviderConfig;
import com.paymentorchestration.domain.entity.ProviderFeeRate;
import com.paymentorchestration.domain.repository.ProviderConfigRepository;
import com.paymentorchestration.domain.repository.ProviderFeeRateRepository;
import com.paymentorchestration.provider.dto.*;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * PayMongo adapter — Philippine Maya / cards / e-wallets provider.
 * Docs: https://developers.paymongo.com/reference
 * Sandbox: https://api.paymongo.com/v1 (same URL, test keys differentiate)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PayMongoAdapter implements PaymentProviderPort {

    private final PayMongoProperties properties;
    private final ProviderConfigRepository providerConfigRepository;
    private final ProviderFeeRateRepository providerFeeRateRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Override
    public Provider getProvider() {
        return Provider.PAYMONGO;
    }

    @Override
    public PaymentResult initiatePayment(PaymentRequest request) {
        log.info("[paymongo] Initiating payment for order {}", request.getMerchantOrderId());

        // PayMongo amount is in centavos (PHP cents)
        long amountInCentavos = request.getAmount().multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, Object> attributes = new LinkedHashMap<>();
        attributes.put("amount", amountInCentavos);
        attributes.put("currency", "PHP");
        attributes.put("payment_method_allowed", List.of("card", "paymaya", "gcash"));
        attributes.put("capture_type", "automatic");
        attributes.put("description", request.getDescription() != null ? request.getDescription() : request.getMerchantOrderId());

        Map<String, Object> body = Map.of("data", Map.of("attributes", attributes));

        try {
            Map<?, ?> response = webClientBuilder.build()
                    .post()
                    .uri(properties.getBaseUrl() + "/payment_intents")
                    .header("Authorization", basicAuth(properties.getSecretKey()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(status -> status.isError(), res -> res.bodyToMono(String.class)
                            .map(b -> new ProviderException(Provider.PAYMONGO, "API error: " + b)))
                    .bodyToMono(Map.class)
                    .block();

            Map<?, ?> data = (Map<?, ?>) response.get("data");
            String intentId = (String) data.get("id");
            Map<?, ?> attrs = (Map<?, ?>) data.get("attributes");
            String clientKey = (String) attrs.get("client_key");

            // Checkout URL for redirect-based payment
            String checkoutUrl = "https://checkout.paymongo.com/payment_intents/" + intentId + "?client_key=" + clientKey;

            log.info("[paymongo] Payment intent created: id={}", intentId);

            return PaymentResult.builder()
                    .providerTransactionId(intentId)
                    .status(PaymentStatus.PROCESSING)
                    .redirectUrl(checkoutUrl)
                    .fee(calculateFee(request.getAmount(), request.getPaymentMethod()))
                    .rawResponse(objectMapper.writeValueAsString(response))
                    .build();

        } catch (ProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ProviderException(Provider.PAYMONGO, "Failed to create payment intent", e);
        }
    }

    @Override
    public PaymentStatusResult queryPaymentStatus(String providerTransactionId) {
        log.info("[paymongo] Querying status for intent {}", providerTransactionId);

        try {
            Map<?, ?> response = webClientBuilder.build()
                    .get()
                    .uri(properties.getBaseUrl() + "/payment_intents/" + providerTransactionId)
                    .header("Authorization", basicAuth(properties.getSecretKey()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            Map<?, ?> data = (Map<?, ?>) response.get("data");
            Map<?, ?> attrs = (Map<?, ?>) data.get("attributes");
            String status = (String) attrs.get("status");

            return PaymentStatusResult.builder()
                    .providerTransactionId(providerTransactionId)
                    .status(mapIntentStatus(status))
                    .rawResponse(response.toString())
                    .build();

        } catch (Exception e) {
            throw new ProviderException(Provider.PAYMONGO, "Failed to query payment intent status", e);
        }
    }

    @Override
    public RefundResult initiateRefund(RefundRequest request) {
        log.info("[paymongo] Initiating refund for intent {}", request.getProviderTransactionId());

        long amountInCentavos = request.getAmount().multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, Object> attributes = new LinkedHashMap<>();
        attributes.put("amount", amountInCentavos);
        attributes.put("payment_id", request.getProviderTransactionId());
        attributes.put("reason", request.getReason() != null ? request.getReason() : "others");
        attributes.put("notes", "Refund for order " + request.getTransactionId());

        Map<String, Object> body = Map.of("data", Map.of("attributes", attributes));

        try {
            Map<?, ?> response = webClientBuilder.build()
                    .post()
                    .uri(properties.getBaseUrl() + "/refunds")
                    .header("Authorization", basicAuth(properties.getSecretKey()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            Map<?, ?> data = (Map<?, ?>) response.get("data");
            String refundId = (String) data.get("id");

            return RefundResult.builder()
                    .providerRefundId(refundId)
                    .status(PaymentStatus.REFUNDED)
                    .amount(request.getAmount())
                    .rawResponse(response.toString())
                    .build();

        } catch (Exception e) {
            throw new ProviderException(Provider.PAYMONGO, "Failed to initiate refund", e);
        }
    }

    @Override
    public boolean verifyWebhookSignature(byte[] rawBody, Map<String, String> headers) {
        // PayMongo signature header: "paymongo-signature: t=<timestamp>,te=<hmac>,li=<hmac>"
        String signatureHeader = headers.get("paymongo-signature");
        if (signatureHeader == null) {
            log.warn("[paymongo] Missing paymongo-signature header");
            return false;
        }

        try {
            Map<String, String> sigParts = parseSignatureHeader(signatureHeader);
            String timestamp = sigParts.get("t");
            String receivedHmac = sigParts.get("te"); // test environment

            if (timestamp == null || receivedHmac == null) {
                log.warn("[paymongo] Malformed signature header: {}", signatureHeader);
                return false;
            }

            String bodyStr = new String(rawBody, StandardCharsets.UTF_8);
            String dataToSign = timestamp + "." + bodyStr;
            String computed = hmacSha256(properties.getWebhookSecret(), dataToSign);

            return secureEquals(computed, receivedHmac);

        } catch (Exception e) {
            log.error("[paymongo] Signature verification failed", e);
            return false;
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public WebhookParseResult parseWebhookPayload(String rawBody) {
        try {
            Map<?, ?> payload = objectMapper.readValue(rawBody, Map.class);
            Map<?, ?> data = (Map<?, ?>) payload.get("data");
            Map<?, ?> dataAttrs = (Map<?, ?>) data.get("attributes");

            // Nested: data.attributes.data.attributes.status
            Map<?, ?> innerData = (Map<?, ?>) dataAttrs.get("data");
            Map<?, ?> innerAttrs = (Map<?, ?>) innerData.get("attributes");
            String status = (String) innerAttrs.get("status");
            String paymentId = (String) innerData.get("id");

            return WebhookParseResult.builder()
                    .provider(Provider.PAYMONGO)
                    .providerTransactionId(paymentId)
                    .status(mapIntentStatus(status))
                    .rawPayload(rawBody)
                    .build();

        } catch (Exception e) {
            throw new ProviderException(Provider.PAYMONGO, "Failed to parse webhook payload", e);
        }
    }

    @Override
    public List<PaymentMethod> supportedMethods() {
        return List.of(PaymentMethod.CARD, PaymentMethod.MAYA, PaymentMethod.GCASH,
                       PaymentMethod.GRABPAY, PaymentMethod.EWALLET);
    }

    @Override
    public BigDecimal calculateFee(BigDecimal amount, PaymentMethod paymentMethod) {
        if (paymentMethod == null) paymentMethod = PaymentMethod.MAYA;
        return providerFeeRateRepository
                .findByProviderAndPaymentMethodAndActiveTrue(Provider.PAYMONGO, paymentMethod)
                .map(rate -> rate.compute(amount))
                .orElse(BigDecimal.ZERO);
    }

    @Override
    public boolean isAvailable() {
        return providerConfigRepository.findById(Provider.PAYMONGO)
                .map(ProviderConfig::isEnabled)
                .orElse(false);
    }

    // --- private helpers ---

    private String basicAuth(String key) {
        String credentials = key + ":";
        return "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }

    private String hmacSha256(String secret, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    private boolean secureEquals(String a, String b) {
        if (a == null || b == null) return false;
        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);
        if (aBytes.length != bBytes.length) return false;
        int result = 0;
        for (int i = 0; i < aBytes.length; i++) {
            result |= aBytes[i] ^ bBytes[i];
        }
        return result == 0;
    }

    private PaymentStatus mapIntentStatus(String status) {
        if (status == null) return PaymentStatus.PROCESSING;
        return switch (status.toLowerCase()) {
            case "succeeded", "paid" -> PaymentStatus.SUCCESS;
            case "payment_error", "cancelled" -> PaymentStatus.FAILED;
            default -> PaymentStatus.PROCESSING;
        };
    }

    private Map<String, String> parseSignatureHeader(String header) {
        Map<String, String> parts = new LinkedHashMap<>();
        for (String part : header.split(",")) {
            int idx = part.indexOf('=');
            if (idx > 0) {
                parts.put(part.substring(0, idx).trim(), part.substring(idx + 1).trim());
            }
        }
        return parts;
    }
}
