package com.paymentorchestration.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when the routing engine cannot select a provider —
 * e.g. no providers are enabled for the requested region.
 */
public class RoutingException extends PosException {

    public RoutingException(String message) {
        super(message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
