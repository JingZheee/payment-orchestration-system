package com.paymentorchestration.provider.billplz;

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
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.List;

/**
 * Billplz adapter — Malaysian FPX bank transfer provider.
 * Docs: https://www.billplz.com/api
 * Sandbox: https://www.billplz-sandbox.com
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BillplzAdapter implements PaymentProviderPort {

    private final BillplzProperties properties;
    private final ProviderConfigRepository providerConfigRepository;
    private final ProviderFeeRateRepository providerFeeRateRepository;
    private final WebClient.Builder webClientBuilder;

    @Override
    public Provider getProvider() {
        return Provider.BILLPLZ;
    }

    @Override
    public PaymentResult initiatePayment(PaymentRequest request) {
        log.info("[billplz] Initiating payment for order {}", request.getMerchantOrderId());

        // Billplz amount is in cents (sen)
        int amountInCents = request.getAmount().multiply(BigDecimal.valueOf(100)).intValue();

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("collection_id", properties.getCollectionId());
        formData.add("email", request.getCustomerEmail() != null ? request.getCustomerEmail() : "customer@example.com");
        formData.add("name", "Customer");
        formData.add("amount", String.valueOf(amountInCents));
        formData.add("callback_url", "https://expansion-palm-molecule.ngrok-free.dev/api/v1/webhooks/BILLPLZ");
        formData.add("redirect_url", request.getRedirectUrl() != null ? request.getRedirectUrl() : "http://localhost:4200/payment-result");
        formData.add("description", request.getDescription() != null ? request.getDescription() : request.getMerchantOrderId());
        formData.add("reference_1", request.getTransactionId().toString());

        try {
            Map<?, ?> response = webClientBuilder.build()
                    .post()
                    .uri(properties.getBaseUrl() + "/bills")
                    .header("Authorization", basicAuth(properties.getApiKey()))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.fromFormData(formData))
                    .retrieve()
                    .onStatus(status -> status.isError(), res -> res.bodyToMono(String.class)
                            .map(body -> new ProviderException(Provider.BILLPLZ, "API error: " + body)))
                    .bodyToMono(Map.class)
                    .block();

            String billId = (String) response.get("id");
            String billUrl = (String) response.get("url");

            log.info("[billplz] Bill created: id={}, url={}", billId, billUrl);

            return PaymentResult.builder()
                    .providerTransactionId(billId)
                    .status(PaymentStatus.PROCESSING)
                    .redirectUrl(billUrl)
                    .fee(calculateFee(request.getAmount(), request.getRegion(), request.getPaymentMethod()))
                    .rawResponse(response.toString())
                    .build();

        } catch (ProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ProviderException(Provider.BILLPLZ, "Failed to create bill", e);
        }
    }

    @Override
    public PaymentStatusResult queryPaymentStatus(String providerTransactionId) {
        log.info("[billplz] Querying status for bill {}", providerTransactionId);

        try {
            Map<?, ?> response = webClientBuilder.build()
                    .get()
                    .uri(properties.getBaseUrl() + "/bills/" + providerTransactionId)
                    .header("Authorization", basicAuth(properties.getApiKey()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            boolean paid = Boolean.TRUE.equals(response.get("paid"));
            PaymentStatus status = paid ? PaymentStatus.SUCCESS : PaymentStatus.PROCESSING;

            return PaymentStatusResult.builder()
                    .providerTransactionId(providerTransactionId)
                    .status(status)
                    .rawResponse(response.toString())
                    .build();

        } catch (Exception e) {
            throw new ProviderException(Provider.BILLPLZ, "Failed to query bill status", e);
        }
    }

    @Override
    public RefundResult initiateRefund(RefundRequest request) {
        // Billplz does not support programmatic refunds via API
        throw new ProviderException(Provider.BILLPLZ, "Billplz does not support API-initiated refunds");
    }

    @Override
    public boolean verifyWebhookSignature(byte[] rawBody, Map<String, String> headers,
                                          Map<String, String> formParams) {
        // Billplz puts the signature in the form body as x_signature.
        // formParams is already decoded by Tomcat — no manual URL-decoding needed.
        try {
            String receivedSignature = formParams.get("x_signature");
            if (receivedSignature == null) {
                log.warn("[billplz] No x_signature in form params");
                return false;
            }

            // Sort by key (case-insensitive), concatenate key+value, join with "|"
            String signatureData = formParams.entrySet().stream()
                    .filter(e -> !e.getKey().equals("x_signature"))
                    .sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
                    .map(e -> e.getKey() + e.getValue())
                    .reduce((a, b) -> a + "|" + b)
                    .orElse("");

            String expected = hmacSha256(properties.getWebhookSecret(), signatureData);
            log.debug("[billplz] signatureData='{}' expected='{}' received='{}'",
                    signatureData, expected, receivedSignature);
            return secureEquals(expected, receivedSignature);

        } catch (Exception e) {
            log.error("[billplz] Signature verification failed", e);
            return false;
        }
    }

    @Override
    public WebhookParseResult parseWebhookPayload(Map<String, String> formParams) {
        String billId = formParams.get("id");
        boolean paid = "true".equalsIgnoreCase(formParams.get("paid"));
        PaymentStatus status = paid ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

        log.debug("[billplz] parseWebhookPayload: id={} paid={} state={}",
                billId, formParams.get("paid"), formParams.get("state"));

        return WebhookParseResult.builder()
                .provider(Provider.BILLPLZ)
                .providerTransactionId(billId)
                .status(status)
                .rawPayload(formParams.toString())
                .build();
    }

    @Override
    public WebhookParseResult parseWebhookPayload(String rawBody) {
        // Not used for Billplz — form-encoded path goes through parseWebhookPayload(Map)
        return parseWebhookPayload(java.util.Collections.emptyMap());
    }

    @Override
    public List<PaymentMethod> supportedMethods() {
        return List.of(PaymentMethod.FPX, PaymentMethod.CARD, PaymentMethod.EWALLET);
    }

    @Override
    public BigDecimal calculateFee(BigDecimal amount, Region region, PaymentMethod paymentMethod) {
        if (paymentMethod == null) paymentMethod = PaymentMethod.FPX;
        // BILLPLZ only operates in MY; region parameter accepted for interface consistency
        return providerFeeRateRepository
                .findByProviderAndRegionAndPaymentMethodAndActiveTrue(Provider.BILLPLZ, Region.MY, paymentMethod)
                .map(rate -> rate.compute(amount))
                .orElse(BigDecimal.ZERO);
    }

    @Override
    public boolean isAvailable() {
        return providerConfigRepository.findById(Provider.BILLPLZ)
                .map(ProviderConfig::isEnabled)
                .orElse(false);
    }

    // --- private helpers ---

    private String basicAuth(String apiKey) {
        String credentials = apiKey + ":";
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

    private Map<String, String> parseFormEncoded(String body) {
        Map<String, String> params = new LinkedHashMap<>();
        if (body == null || body.isBlank()) return params;
        for (String pair : body.split("&")) {
            int idx = pair.indexOf('=');
            if (idx > 0) {
                String key = URLDecoder.decode(
                        pair.substring(0, idx).replace("+", "%2B"),
                        StandardCharsets.UTF_8);
                String value = URLDecoder.decode(
                        pair.substring(idx + 1).replace("+", "%2B"),
                        StandardCharsets.UTF_8);
                params.put(key, value);
            }
        }
        return params;
    }
}
