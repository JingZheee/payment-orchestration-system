package com.paymentorchestration.provider.xendit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.common.exception.ProviderException;
import com.paymentorchestration.domain.entity.ProviderConfig;
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
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Xendit adapter — Philippines GCash / Maya / GrabPay / cards (Invoice API)
 * and claim disbursements (Disbursements API).
 *
 * Collection flow  : POST /v2/invoices → hosted checkout redirect URL
 * Disbursement flow: POST /disbursements → direct payout to bank/e-wallet
 *
 * Sandbox: https://api.xendit.co (same URL, test keys differentiate)
 * Docs: https://developers.xendit.co
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class XenditAdapter implements PaymentProviderPort {

    private static final String INV_PREFIX  = "INV_";
    private static final String DISB_PREFIX = "DISB_";

    // Sandbox test bank — Xendit accepts any account details in test mode
    private static final String SANDBOX_BANK_CODE   = "BDO";
    private static final String SANDBOX_ACCOUNT_NO  = "1234567890";

    private final XenditProperties properties;
    private final ProviderConfigRepository providerConfigRepository;
    private final ProviderFeeRateRepository providerFeeRateRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Override
    public Provider getProvider() {
        return Provider.XENDIT;
    }

    // -------------------------------------------------------------------------
    // initiatePayment — routes to Invoice (collection) or Disbursement (claims)
    // -------------------------------------------------------------------------

    @Override
    public PaymentResult initiatePayment(PaymentRequest request) {
        if (request.getPaymentType() == PaymentType.CLAIMS_DISBURSEMENT) {
            return initiateDisbursement(request);
        }
        return initiateInvoice(request);
    }

    private PaymentResult initiateInvoice(PaymentRequest request) {
        log.info("[xendit] Creating invoice for order {}", request.getMerchantOrderId());

        Map<String, Object> customer = Map.of("email", request.getCustomerEmail());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("external_id",          request.getMerchantOrderId());
        body.put("amount",               request.getAmount());
        body.put("currency",             "PHP");
        body.put("description",          description(request));
        body.put("customer",             customer);
        body.put("success_redirect_url", request.getRedirectUrl());
        body.put("failure_redirect_url", request.getRedirectUrl());
        body.put("payment_methods",      toXenditMethods(request.getPaymentMethod()));

        try {
            Map<?, ?> response = post("/v2/invoices", body);

            String invoiceId  = (String) response.get("id");
            String invoiceUrl = (String) response.get("invoice_url");

            log.info("[xendit] Invoice created: id={}", invoiceId);

            return PaymentResult.builder()
                    .providerTransactionId(INV_PREFIX + invoiceId)
                    .status(PaymentStatus.PROCESSING)
                    .redirectUrl(invoiceUrl)
                    .fee(calculateFee(request.getAmount(), request.getRegion(), request.getPaymentMethod()))
                    .rawResponse(objectMapper.writeValueAsString(response))
                    .build();

        } catch (ProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ProviderException(Provider.XENDIT, "Failed to create invoice", e);
        }
    }

    private PaymentResult initiateDisbursement(PaymentRequest request) {
        log.info("[xendit] Creating disbursement for order {}", request.getMerchantOrderId());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("external_id",          request.getMerchantOrderId());
        body.put("amount",               request.getAmount());
        body.put("bank_code",            SANDBOX_BANK_CODE);
        body.put("account_holder_name",  "Test Policyholder");
        body.put("account_number",       SANDBOX_ACCOUNT_NO);
        body.put("description",          description(request));
        body.put("email_to",             List.of(request.getCustomerEmail()));

        try {
            Map<?, ?> response = post("/disbursements", body);

            String disbId  = (String) response.get("id");
            String status  = (String) response.get("status");

            log.info("[xendit] Disbursement created: id={} status={}", disbId, status);

            return PaymentResult.builder()
                    .providerTransactionId(DISB_PREFIX + disbId)
                    .status(mapDisbursementStatus(status))
                    .redirectUrl(null)
                    .fee(BigDecimal.TEN)  // Xendit flat PHP 10 disbursement fee
                    .rawResponse(objectMapper.writeValueAsString(response))
                    .build();

        } catch (ProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ProviderException(Provider.XENDIT, "Failed to create disbursement", e);
        }
    }

    // -------------------------------------------------------------------------
    // queryPaymentStatus
    // -------------------------------------------------------------------------

    @Override
    public PaymentStatusResult queryPaymentStatus(String providerTransactionId) {
        if (providerTransactionId.startsWith(DISB_PREFIX)) {
            return queryDisbursementStatus(providerTransactionId.substring(DISB_PREFIX.length()));
        }
        String invoiceId = providerTransactionId.startsWith(INV_PREFIX)
                ? providerTransactionId.substring(INV_PREFIX.length())
                : providerTransactionId;
        return queryInvoiceStatus(invoiceId, providerTransactionId);
    }

    private PaymentStatusResult queryInvoiceStatus(String invoiceId, String originalId) {
        log.info("[xendit] Querying invoice status: {}", invoiceId);
        try {
            Map<?, ?> response = get("/v2/invoices/" + invoiceId);
            String status = (String) response.get("status");
            return PaymentStatusResult.builder()
                    .providerTransactionId(originalId)
                    .status(mapInvoiceStatus(status))
                    .rawResponse(response.toString())
                    .build();
        } catch (Exception e) {
            throw new ProviderException(Provider.XENDIT, "Failed to query invoice status", e);
        }
    }

    private PaymentStatusResult queryDisbursementStatus(String disbId) {
        log.info("[xendit] Querying disbursement status: {}", disbId);
        try {
            Map<?, ?> response = get("/disbursements/" + disbId);
            String status = (String) response.get("status");
            return PaymentStatusResult.builder()
                    .providerTransactionId(DISB_PREFIX + disbId)
                    .status(mapDisbursementStatus(status))
                    .rawResponse(response.toString())
                    .build();
        } catch (Exception e) {
            throw new ProviderException(Provider.XENDIT, "Failed to query disbursement status", e);
        }
    }

    // -------------------------------------------------------------------------
    // Refund
    // -------------------------------------------------------------------------

    @Override
    public RefundResult initiateRefund(RefundRequest request) {
        log.info("[xendit] Initiating refund for {}", request.getProviderTransactionId());

        // Xendit refunds target the payment ID, not the invoice ID.
        // The invoice ID is stored with INV_ prefix — we strip it here.
        String paymentId = request.getProviderTransactionId().replace(INV_PREFIX, "");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("payment_id", paymentId);
        body.put("amount",     request.getAmount());
        body.put("reason",     request.getReason() != null ? request.getReason() : "OTHERS");

        try {
            Map<?, ?> response = post("/refunds", body);
            String refundId = (String) response.get("id");

            return RefundResult.builder()
                    .providerRefundId(refundId)
                    .status(PaymentStatus.REFUNDED)
                    .amount(request.getAmount())
                    .rawResponse(response.toString())
                    .build();
        } catch (Exception e) {
            throw new ProviderException(Provider.XENDIT, "Failed to initiate refund", e);
        }
    }

    // -------------------------------------------------------------------------
    // Webhook
    // -------------------------------------------------------------------------

    @Override
    public boolean verifyWebhookSignature(byte[] rawBody, Map<String, String> headers,
                                          Map<String, String> formParams) {
        // Xendit uses a static callback token, not HMAC.
        // The token is set in Xendit dashboard → Settings → Callbacks.
        String token = headers.get("x-callback-token");
        if (token == null) {
            log.warn("[xendit] Missing x-callback-token header");
            return false;
        }
        return token.equals(properties.getWebhookToken());
    }

    @Override
    @SuppressWarnings("unchecked")
    public WebhookParseResult parseWebhookPayload(String rawBody) {
        try {
            Map<?, ?> payload = objectMapper.readValue(rawBody, Map.class);

            // Xendit sends the full invoice or disbursement object as the body.
            // Detect by presence of "invoice_url" (invoice) vs "bank_code" (disbursement).
            String id     = (String) payload.get("id");
            String status = (String) payload.get("status");

            PaymentStatus mappedStatus;
            String providerTxId;

            if (payload.containsKey("bank_code")) {
                mappedStatus = mapDisbursementStatus(status);
                providerTxId = DISB_PREFIX + id;
            } else {
                mappedStatus = mapInvoiceStatus(status);
                providerTxId = INV_PREFIX + id;
            }

            return WebhookParseResult.builder()
                    .provider(Provider.XENDIT)
                    .providerTransactionId(providerTxId)
                    .status(mappedStatus)
                    .rawPayload(rawBody)
                    .build();

        } catch (Exception e) {
            throw new ProviderException(Provider.XENDIT, "Failed to parse webhook payload", e);
        }
    }

    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------

    @Override
    public List<String> supportedMethods() {
        return List.of("CARD", "GCASH", "MAYA", "GRABPAY", "EWALLET");
    }

    @Override
    public List<PaymentType> supportedPaymentTypes() {
        return List.of(PaymentType.PREMIUM_COLLECTION, PaymentType.CLAIMS_DISBURSEMENT);
    }

    @Override
    public BigDecimal calculateFee(BigDecimal amount, Region region, String paymentMethod) {
        if (paymentMethod == null) paymentMethod = "GCASH";
        return providerFeeRateRepository
                .findByProviderAndRegionAndPaymentMethodAndActiveTrue(Provider.XENDIT, Region.PH, paymentMethod)
                .map(rate -> rate.compute(amount))
                .orElse(BigDecimal.ZERO);
    }

    @Override
    public boolean isAvailable() {
        return providerConfigRepository.findById(Provider.XENDIT)
                .map(ProviderConfig::isEnabled)
                .orElse(false);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Map<?, ?> post(String path, Map<String, Object> body) {
        return webClientBuilder.build()
                .post()
                .uri(properties.getBaseUrl() + path)
                .header("Authorization", basicAuth())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .onStatus(status -> status.isError(), res -> res.bodyToMono(String.class)
                        .map(b -> new ProviderException(Provider.XENDIT, "API error: " + b)))
                .bodyToMono(Map.class)
                .block();
    }

    private Map<?, ?> get(String path) {
        return webClientBuilder.build()
                .get()
                .uri(properties.getBaseUrl() + path)
                .header("Authorization", basicAuth())
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    private String basicAuth() {
        String credentials = properties.getSecretKey() + ":";
        return "Basic " + Base64.getEncoder()
                .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }

    private String description(PaymentRequest request) {
        return request.getDescription() != null ? request.getDescription() : request.getMerchantOrderId();
    }

    private List<String> toXenditMethods(String paymentMethod) {
        if (paymentMethod == null) return List.of("GCASH", "PAYMAYA", "CREDIT_CARD");
        return switch (paymentMethod.toUpperCase()) {
            case "GCASH"   -> List.of("GCASH");
            case "MAYA"    -> List.of("PAYMAYA");
            case "GRABPAY" -> List.of("GRABPAY");
            case "CARD"    -> List.of("CREDIT_CARD");
            case "EWALLET" -> List.of("GCASH", "PAYMAYA", "GRABPAY");
            default        -> List.of("GCASH", "PAYMAYA", "CREDIT_CARD");
        };
    }

    private PaymentStatus mapInvoiceStatus(String status) {
        if (status == null) return PaymentStatus.PROCESSING;
        return switch (status.toUpperCase()) {
            case "PAID", "SETTLED" -> PaymentStatus.SUCCESS;
            case "EXPIRED"         -> PaymentStatus.FAILED;
            default                -> PaymentStatus.PROCESSING;
        };
    }

    private PaymentStatus mapDisbursementStatus(String status) {
        if (status == null) return PaymentStatus.PROCESSING;
        return switch (status.toUpperCase()) {
            case "COMPLETED" -> PaymentStatus.SUCCESS;
            case "FAILED"    -> PaymentStatus.FAILED;
            default          -> PaymentStatus.PROCESSING;
        };
    }
}
