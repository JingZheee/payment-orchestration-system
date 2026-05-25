package com.paymentorchestration.common.exception;

import org.springframework.http.HttpStatus;

public class DuplicatePaymentException extends PosException {

    public DuplicatePaymentException(String policyId) {
        super("Policy " + policyId + " has already been paid", HttpStatus.CONFLICT);
    }
}
