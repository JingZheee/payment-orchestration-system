package com.paymentorchestration.common.exception;

import com.paymentorchestration.common.enums.Provider;
import org.springframework.http.HttpStatus;

/**
 * Thrown when a provider adapter encounters an error communicating
 * with the external provider API (e.g. HTTP 5xx, timeout, parse failure).
 */
public class ProviderException extends PosException {

    private final Provider provider;

    public ProviderException(Provider provider, String message) {
        super(message, HttpStatus.BAD_GATEWAY);
        this.provider = provider;
    }

    public ProviderException(Provider provider, String message, Throwable cause) {
        super(message, HttpStatus.BAD_GATEWAY, cause);
        this.provider = provider;
    }

    public Provider getProvider() {
        return provider;
    }
}
