package com.paymentorchestration.common.exception;

import com.paymentorchestration.common.enums.Provider;
import org.springframework.http.HttpStatus;

/**
 * Thrown when a webhook's HMAC/RSA signature fails verification.
 * Still returns HTTP 200 to the provider (to avoid retries), but
 * the event is logged with signature_valid=false and not processed.
 */
public class WebhookVerificationException extends PosException {

    private final Provider provider;

    public WebhookVerificationException(Provider provider) {
        super("Webhook signature verification failed for provider: " + provider, HttpStatus.OK);
        this.provider = provider;
    }

    public Provider getProvider() {
        return provider;
    }
}
