package com.paymentorchestration.provider.midtrans;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/**
 * Midtrans adapter — Indonesian Virtual Account / QRIS provider.
 * Docs: https://docs.midtrans.com/en/core-api/bank-transfer
 * Sandbox: https://api.sandbox.midtrans.com
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MidtransAdapter implements PaymentProviderPort {

    private final MidtransProperties properties;
    private final ProviderConfigRepository providerConfigRepository;
    private final ProviderFeeRateRepository providerFeeRateRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Override
    public Provider getProvider() {
        return Provider.MIDTRANS;
    }

    @Override
    public PaymentResult initiatePayment(PaymentRequest request) {
        String method = request.getPaymentMethod() != null
                ? request.getPaymentMethod()
                : "VIRTUAL_ACCOUNT";
        log.info("[midtrans] Initiating {} payment for order {}", method, request.getMerchantOrderId());

        if ("CARD".equals(method)) {
            return initiateCardViaSnap(request);
        }

        long grossAmount = request.getAmount().longValue();
        String customerEmail = request.getCustomerEmail() != null
                ? request.getCustomerEmail()
                : "customer@example.com";

        Map<String, Object> body = buildCoreApiBody(method, request.getMerchantOrderId(), grossAmount, customerEmail);

        try {
            Map<?, ?> response = webClientBuilder.build()
                    .post()
                    .uri(properties.getBaseUrl() + "/charge")
                    .header("Authorization", basicAuth(properties.getServerKey()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(status -> status.isError(), res -> res.bodyToMono(String.class)
                            .map(b -> new ProviderException(Provider.MIDTRANS, "API error: " + b)))
                    .bodyToMono(Map.class)
                    .block();

            // Use order_id (= merchantOrderId) as providerTransactionId — Midtrans accepts it
            // on both the status endpoint (GET /v2/{orderId}/status) and includes it in webhooks.
            // Using Midtrans's internal transaction_id would break Snap card flows where no
            // transaction_id exists until the customer completes payment.
            String midtransInternalId = (String) response.get("transaction_id");
            String rawJson = objectMapper.writeValueAsString(response);

            String redirectUrl = null;
            String vaNumber = null;

            if ("QRIS".equals(method)) {
                redirectUrl = extractActionUrl(response, "generate-qr-code");
            } else if ("GOPAY".equals(method) || "EWALLET".equals(method)) {
                redirectUrl = extractActionUrl(response, "deeplink-redirect");
            } else {
                // VIRTUAL_ACCOUNT — surface the BCA VA number
                vaNumber = extractVaNumber(response);
                log.info("[midtrans] VA number: {}", vaNumber);
            }

            log.info("[midtrans] Charge created: orderId={} midtransId={} method={} vaNumber={} redirectUrl={}",
                    request.getMerchantOrderId(), midtransInternalId, method, vaNumber, redirectUrl);

            return PaymentResult.builder()
                    .providerTransactionId(request.getMerchantOrderId())
                    .status(PaymentStatus.PROCESSING)
                    .redirectUrl(redirectUrl)
                    .vaNumber(vaNumber)
                    .fee(calculateFee(request.getAmount(), request.getRegion(), method))
                    .rawResponse(rawJson)
                    .build();

        } catch (ProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ProviderException(Provider.MIDTRANS, "Failed to create charge", e);
        }
    }

    /**
     * Card payments use the Snap API — Midtrans's hosted payment page handles
     * card tokenization client-side, so no Midtrans.js is needed in our frontend.
     * Snap returns a redirect_url the customer opens to enter card details.
     */
    private PaymentResult initiateCardViaSnap(PaymentRequest request) {
        long grossAmount = request.getAmount().longValue();
        String customerEmail = request.getCustomerEmail() != null
                ? request.getCustomerEmail()
                : "customer@example.com";

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("transaction_details", Map.of(
                "order_id", request.getMerchantOrderId(),
                "gross_amount", grossAmount));
        body.put("customer_details", Map.of("email", customerEmail));
        body.put("enabled_payments", List.of("credit_card"));

        try {
            Map<?, ?> response = webClientBuilder.build()
                    .post()
                    .uri(properties.getSnapBaseUrl() + "/transactions")
                    .header("Authorization", basicAuth(properties.getServerKey()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(status -> status.isError(), res -> res.bodyToMono(String.class)
                            .map(b -> new ProviderException(Provider.MIDTRANS, "Snap API error: " + b)))
                    .bodyToMono(Map.class)
                    .block();

            String snapToken = (String) response.get("token");
            String redirectUrl = (String) response.get("redirect_url");
            String rawJson = objectMapper.writeValueAsString(response);

            log.info("[midtrans] Snap card charge: orderId={} token={} redirectUrl={}",
                    request.getMerchantOrderId(), snapToken, redirectUrl);

            return PaymentResult.builder()
                    .providerTransactionId(request.getMerchantOrderId())
                    .status(PaymentStatus.PENDING)
                    .redirectUrl(redirectUrl)
                    .fee(calculateFee(request.getAmount(), request.getRegion(), "CARD"))
                    .rawResponse(rawJson)
                    .build();

        } catch (ProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ProviderException(Provider.MIDTRANS, "Failed to create Snap charge", e);
        }
    }

    private Map<String, Object> buildCoreApiBody(String method, String orderId, long grossAmount, String email) {
        Map<String, Object> transactionDetails = Map.of("order_id", orderId, "gross_amount", grossAmount);
        Map<String, Object> customerDetails = Map.of("email", email);

        if ("QRIS".equals(method)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("payment_type", "qris");
            body.put("transaction_details", transactionDetails);
            body.put("customer_details", customerDetails);
            return body;
        } else if ("GOPAY".equals(method) || "EWALLET".equals(method)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("payment_type", "gopay");
            body.put("transaction_details", transactionDetails);
            body.put("gopay", Map.of("enable_callback", true));
            body.put("customer_details", customerDetails);
            return body;
        } else {
            // VIRTUAL_ACCOUNT → BCA bank transfer
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("payment_type", "bank_transfer");
            body.put("transaction_details", transactionDetails);
            body.put("bank_transfer", Map.of("bank", "bca"));
            body.put("customer_details", customerDetails);
            return body;
        }
    }

    @Override
    public PaymentStatusResult queryPaymentStatus(String providerTransactionId) {
        log.info("[midtrans] Querying status for txn {}", providerTransactionId);

        try {
            Map<?, ?> response = webClientBuilder.build()
                    .get()
                    .uri(properties.getBaseUrl() + "/" + providerTransactionId + "/status")
                    .header("Authorization", basicAuth(properties.getServerKey()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            String txStatus = (String) response.get("transaction_status");
            PaymentStatus status = mapTransactionStatus(txStatus);

            return PaymentStatusResult.builder()
                    .providerTransactionId(providerTransactionId)
                    .status(status)
                    .rawResponse(response.toString())
                    .build();

        } catch (Exception e) {
            throw new ProviderException(Provider.MIDTRANS, "Failed to query transaction status", e);
        }
    }

    @Override
    public RefundResult initiateRefund(RefundRequest request) {
        log.info("[midtrans] Initiating refund for txn {}", request.getProviderTransactionId());

        Map<String, Object> body = Map.of(
                "refund_key", request.getTransactionId().toString(),
                "amount", request.getAmount().longValue(),
                "reason", request.getReason() != null ? request.getReason() : "Customer request"
        );

        try {
            Map<?, ?> response = webClientBuilder.build()
                    .post()
                    .uri(properties.getBaseUrl() + "/" + request.getProviderTransactionId() + "/refund")
                    .header("Authorization", basicAuth(properties.getServerKey()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            return RefundResult.builder()
                    .providerRefundId((String) response.get("refund_chargeback_id"))
                    .status(PaymentStatus.REFUNDED)
                    .amount(request.getAmount())
                    .rawResponse(response.toString())
                    .build();

        } catch (Exception e) {
            throw new ProviderException(Provider.MIDTRANS, "Failed to initiate refund", e);
        }
    }

    @Override
    public boolean verifyWebhookSignature(byte[] rawBody, Map<String, String> headers,
                                          Map<String, String> formParams) {
        try {
            // Midtrans signature: SHA512(order_id + status_code + gross_amount + serverKey)
            // The signature_key is in the JSON body itself
            String bodyStr = new String(rawBody, StandardCharsets.UTF_8);
            Map<?, ?> payload = objectMapper.readValue(bodyStr, Map.class);

            String orderId = (String) payload.get("order_id");
            String statusCode = (String) payload.get("status_code");
            String grossAmount = (String) payload.get("gross_amount");
            String receivedSignature = (String) payload.get("signature_key");

            if (orderId == null || statusCode == null || grossAmount == null || receivedSignature == null) {
                log.warn("[midtrans] Missing signature fields in webhook body");
                return false;
            }

            String dataToHash = orderId + statusCode + grossAmount + properties.getServerKey();
            String computed = sha512(dataToHash);
            return secureEquals(computed, receivedSignature);

        } catch (Exception e) {
            log.error("[midtrans] Signature verification failed", e);
            return false;
        }
    }

    @Override
    public WebhookParseResult parseWebhookPayload(String rawBody) {
        try {
            Map<?, ?> payload = objectMapper.readValue(rawBody, Map.class);
            // order_id matches the merchantOrderId we stored as providerTransactionId —
            // works for both Core API (VA/QRIS/GoPay) and Snap (card) webhooks.
            String orderId = (String) payload.get("order_id");
            String txStatus = (String) payload.get("transaction_status");
            PaymentStatus status = mapTransactionStatus(txStatus);

            return WebhookParseResult.builder()
                    .provider(Provider.MIDTRANS)
                    .providerTransactionId(orderId)
                    .status(status)
                    .rawPayload(rawBody)
                    .build();

        } catch (Exception e) {
            throw new ProviderException(Provider.MIDTRANS, "Failed to parse webhook payload", e);
        }
    }

    @Override
    public List<String> supportedMethods() {
        return List.of("VIRTUAL_ACCOUNT", "QRIS", "CARD", "GOPAY", "EWALLET");
    }

    @Override
    public List<PaymentType> supportedPaymentTypes() {
        return List.of(PaymentType.PREMIUM_COLLECTION);
    }

    @Override
    public BigDecimal calculateFee(BigDecimal amount, Region region, String paymentMethod) {
        if (paymentMethod == null) paymentMethod = "VIRTUAL_ACCOUNT";
        // MIDTRANS only operates in ID; region parameter accepted for interface consistency
        return providerFeeRateRepository
                .findByProviderAndRegionAndPaymentMethodAndActiveTrue(Provider.MIDTRANS, Region.ID, paymentMethod)
                .map(rate -> rate.compute(amount))
                .orElse(BigDecimal.ZERO);
    }

    @Override
    public boolean isAvailable() {
        return providerConfigRepository.findById(Provider.MIDTRANS)
                .map(ProviderConfig::isEnabled)
                .orElse(false);
    }

    // --- private helpers ---

    private String basicAuth(String key) {
        String credentials = key + ":";
        return "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }

    private String sha512(String input) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-512");
        byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
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

    private PaymentStatus mapTransactionStatus(String txStatus) {
        if (txStatus == null) return PaymentStatus.PROCESSING;
        return switch (txStatus.toLowerCase()) {
            case "settlement", "capture" -> PaymentStatus.SUCCESS;
            case "deny", "cancel", "expire", "failure" -> PaymentStatus.FAILED;
            case "refund", "partial_refund" -> PaymentStatus.REFUNDED;
            default -> PaymentStatus.PROCESSING;
        };
    }

    @SuppressWarnings("unchecked")
    private String extractVaNumber(Map<?, ?> response) {
        try {
            List<?> vaNumbers = (List<?>) response.get("va_numbers");
            if (vaNumbers != null && !vaNumbers.isEmpty()) {
                Map<?, ?> va = (Map<?, ?>) vaNumbers.get(0);
                return (String) va.get("va_number");
            }
        } catch (Exception ignored) {}
        return null;
    }

    @SuppressWarnings("unchecked")
    private String extractActionUrl(Map<?, ?> response, String actionName) {
        try {
            List<?> actions = (List<?>) response.get("actions");
            if (actions == null) return null;
            for (Object item : actions) {
                Map<?, ?> action = (Map<?, ?>) item;
                if (actionName.equals(action.get("name"))) {
                    return (String) action.get("url");
                }
            }
        } catch (Exception ignored) {}
        return null;
    }
}
