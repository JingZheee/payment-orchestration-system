package com.paymentorchestration.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Message published to RabbitMQ retry queues when a payment
 * is in PROCESSING status and awaiting a webhook callback.
 *
 * The RetryConsumer (in pos-admin) receives this after the TTL expires,
 * queries the provider for current status, and updates the transaction.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetryMessage {

    private UUID transactionId;

    /** 1-based attempt number. After attempt 3, routes to payment.dlq. */
    private int attemptNumber;
}
