package com.paymentorchestration.payment.messaging;

import com.paymentorchestration.payment.dto.RetryMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Publishes a RetryMessage to the appropriate TTL-based retry queue.
 *
 * Attempt → queue mapping:
 *   1 → retry.q.30s   (waits 30 s, then DLX back to retry.exchange)
 *   2 → retry.q.60s
 *   3 → retry.q.120s
 *   4+ → payment.dlq  (terminal — RetryConsumer marks RETRY_EXHAUSTED)
 *
 * Exchanges and queues are declared by RabbitMqConfig in pos-api on startup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RetryPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbitmq.exchanges.retry}")
    private String retryExchange;

    @Value("${rabbitmq.queues.retry-30s}")
    private String queue30s;

    @Value("${rabbitmq.queues.retry-60s}")
    private String queue60s;

    @Value("${rabbitmq.queues.retry-120s}")
    private String queue120s;

    @Value("${rabbitmq.queues.payment-dlq}")
    private String paymentDlq;

    /**
     * Schedule a retry for the given transaction.
     *
     * @param transactionId the transaction to retry
     * @param attemptNumber 1-based attempt (1 = first retry, 4+ = DLQ)
     */
    public void publish(UUID transactionId, int attemptNumber) {
        String routingKey = routingKeyFor(attemptNumber);
        RetryMessage message = RetryMessage.builder()
                .transactionId(transactionId)
                .attemptNumber(attemptNumber)
                .build();

        rabbitTemplate.convertAndSend(retryExchange, routingKey, message);
        log.info("[retry] queued transactionId={} attempt={} queue={}",
                transactionId, attemptNumber, routingKey);
    }

    private String routingKeyFor(int attempt) {
        return switch (attempt) {
            case 1 -> queue30s;
            case 2 -> queue60s;
            case 3 -> queue120s;
            default -> paymentDlq;
        };
    }
}
