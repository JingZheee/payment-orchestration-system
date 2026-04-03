package com.paymentorchestration.provider.port;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.provider.dto.*;

import java.math.BigDecimal;
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
     * @param rawBody   raw request body bytes (before any parsing)
     * @param headers   all HTTP headers from the webhook request
     * @return true if the signature is valid, false otherwise
     */
    boolean verifyWebhookSignature(byte[] rawBody, Map<String, String> headers);

    /**
     * Parse a raw webhook payload into a normalized result.
     * Called after signature verification passes.
     */
    WebhookParseResult parseWebhookPayload(String rawBody);

    /**
     * Calculate the fee for a given transaction amount.
     * Used by ProviderScorer to compare provider costs.
     */
    BigDecimal calculateFee(BigDecimal amount);

    /**
     * Health check. Returns false if the provider is disabled in provider_configs
     * or is known to be degraded. The routing engine skips providers where this is false.
     */
    boolean isAvailable();
}
