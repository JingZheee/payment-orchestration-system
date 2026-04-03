package com.paymentorchestration.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a transaction ID is not found in the database.
 */
public class PaymentNotFoundException extends PosException {

    public PaymentNotFoundException(String transactionId) {
        super("Transaction not found: " + transactionId, HttpStatus.NOT_FOUND);
    }
}
