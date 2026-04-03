package com.paymentorchestration.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an Idempotency-Key is reused with a different request body.
 * HTTP 422 — the key exists but the payload hash doesn't match.
 */
public class IdempotencyConflictException extends PosException {

    public IdempotencyConflictException(String idempotencyKey) {
        super("Idempotency key already used with a different request: " + idempotencyKey,
                HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
