package com.paymentorchestration.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base exception for all application-specific errors.
 * Carries an HTTP status so GlobalExceptionHandler can respond correctly
 * without a long if/else chain.
 */
public class PosException extends RuntimeException {

    private final HttpStatus status;

    public PosException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public PosException(String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
