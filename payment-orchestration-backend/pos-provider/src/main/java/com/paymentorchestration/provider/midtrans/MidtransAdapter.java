package com.paymentorchestration.provider.midtrans;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paymentorchestration.common.enums.PaymentMethod;
import com.paymentorchestration.common.enums.PaymentStatus;
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
        log.info("[midtrans] Initiating payment for order {}", request.getMerchantOrderId());

        // Midtrans uses full currency units (IDR has no sub-unit)
        long grossAmount = request.getAmount().longValue();

        Map<String, Object> body = Map.of(
                "payment_type", "bank_transfer",
                "transaction_details", Map.of(
                        "order_id", request.getMerchantOrderId(),
                        "gross_amount", grossAmount
                ),
                "bank_transfer", Map.of("bank", "bca"),
                "customer_details", Map.of(
                        "email", request.getCustomerEmail() != null ? request.getCustomerEmail() : "customer@example.com"
                )
        );

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

            String transactionId = (String) response.get("transaction_id");
            String rawJson = objectMapper.writeValueAsString(response);

            // VA number is in va_numbers array
            String vaNumber = extractVaNumber(response);
            log.info("[midtrans] Charge created: txn={}, va={}", transactionId, vaNumber);

            return PaymentResult.builder()
                    .providerTransactionId(transactionId)
                    .status(PaymentStatus.PROCESSING)
                    .redirectUrl(null) // VA-based; VA number is in rawResponse
                    .fee(calculateFee(request.getAmount(), request.getRegion(), request.getPaymentMethod()))
                    .rawResponse(rawJson)
                    .build();

        } catch (ProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ProviderException(Provider.MIDTRANS, "Failed to create charge", e);
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
            String transactionId = (String) payload.get("transaction_id");
            String txStatus = (String) payload.get("transaction_status");
            PaymentStatus status = mapTransactionStatus(txStatus);

            return WebhookParseResult.builder()
                    .provider(Provider.MIDTRANS)
                    .providerTransactionId(transactionId)
                    .status(status)
                    .rawPayload(rawBody)
                    .build();

        } catch (Exception e) {
            throw new ProviderException(Provider.MIDTRANS, "Failed to parse webhook payload", e);
        }
    }

    @Override
    public List<PaymentMethod> supportedMethods() {
        return List.of(PaymentMethod.VIRTUAL_ACCOUNT, PaymentMethod.QRIS,
                       PaymentMethod.CARD, PaymentMethod.GOPAY, PaymentMethod.EWALLET);
    }

    @Override
    public BigDecimal calculateFee(BigDecimal amount, Region region, PaymentMethod paymentMethod) {
        if (paymentMethod == null) paymentMethod = PaymentMethod.VIRTUAL_ACCOUNT;
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
}
