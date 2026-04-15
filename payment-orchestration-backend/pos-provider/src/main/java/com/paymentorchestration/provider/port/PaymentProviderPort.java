package com.paymentorchestration.provider.port;

import com.paymentorchestration.common.enums.PaymentMethod;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.provider.dto.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Core contract that every payment provider adapter must implement.
 * The routing engine and payment service depend only on this interface —
 * they never import provider SDKs directly. Adding a new provider means
 * creating one new class that implements this interface.
 */
public interface PaymentProviderPort {

    /** The provider this adapter handles. */
    Provider getProvider();

    /**
     * Initiate a payment. Returns a redirect URL (for redirect-based flows)
     * or a direct result (for server-side flows like virtual accounts).
     */
    PaymentResult initiatePayment(PaymentRequest request);

    /**
     * Poll the provider for the current status of a transaction.
     * Called by the retry consumer when a payment hasn't received a webhook.
     */
    PaymentStatusResult queryPaymentStatus(String providerTransactionId);

    /**
     * Initiate a refund for a completed transaction.
     */
    RefundResult initiateRefund(RefundRequest request);

    /**
     * Verify the webhook signature from the provider.
     * Uses HMAC-SHA256 for Billplz and Midtrans, RSA for PayMongo.
     * Always returns true for Mock provider.
     *
     * @param rawBody    raw request body bytes — used by JSON-body providers (Midtrans, PayMongo)
     * @param headers    all HTTP request headers (lowercased)
     * @param formParams Tomcat-decoded form parameters — populated for
     *                   application/x-www-form-urlencoded requests (Billplz), empty otherwise
     * @return true if the signature is valid, false otherwise
     */
    boolean verifyWebhookSignature(byte[] rawBody, Map<String, String> headers,
                                   Map<String, String> formParams);

    /**
     * Parse a raw webhook payload into a normalized result (JSON-body providers).
     */
    WebhookParseResult parseWebhookPayload(String rawBody);

    /**
     * Parse a form-encoded webhook payload into a normalized result.
     * Default delegates to the String overload by joining key=value pairs.
     * Override in adapters that handle form-encoded webhooks (Billplz).
     */
    default WebhookParseResult parseWebhookPayload(Map<String, String> formParams) {
        return parseWebhookPayload(
                formParams.entrySet().stream()
                        .map(e -> e.getKey() + "=" + e.getValue())
                        .collect(java.util.stream.Collectors.joining("&"))
        );
    }

    /**
     * Returns the payment methods this provider supports.
     * Used by the /payments/methods endpoint to present options to the user before routing.
     */
    List<PaymentMethod> supportedMethods();

    /**
     * Calculate the exact fee for a transaction amount, region, and payment method.
     * Region is required because MOCK covers multiple regions and may have different
     * fee rates per region. Single-region providers (BILLPLZ, MIDTRANS, PAYMONGO)
     * accept the parameter for interface consistency but ignore it.
     */
    BigDecimal calculateFee(BigDecimal amount, Region region, PaymentMethod paymentMethod);

    /**
     * Health check. Returns false if the provider is disabled in provider_configs
     * or is known to be degraded. The routing engine skips providers where this is false.
     */
    boolean isAvailable();
}
