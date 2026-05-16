package com.paymentorchestration.admin.messaging;

import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.domain.entity.Transaction;
import com.paymentorchestration.domain.entity.TransactionEvent;
import com.paymentorchestration.domain.repository.TransactionEventRepository;
import com.paymentorchestration.domain.repository.TransactionRepository;
import com.paymentorchestration.payment.dto.RetryMessage;
import com.paymentorchestration.payment.messaging.PaymentSucceededPublisher;
import com.paymentorchestration.payment.messaging.RetryPublisher;
import com.paymentorchestration.provider.dto.PaymentStatusResult;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Consumes messages from webhook.queue after a TTL-based retry delay has elapsed.
 *
 * Flow per message:
 *   1. Load the transaction. If already resolved (SUCCESS/FAILED/RETRY_EXHAUSTED) — skip.
 *   2. Find the provider adapter and call queryPaymentStatus().
 *   3. If provider confirms SUCCESS or FAILED — update transaction and stop.
 *   4. If still pending — re-publish with attempt+1.
 *      attempt 4+ lands on payment.dlq → handled by DlqConsumer → RETRY_EXHAUSTED.
 *
 * This consumer is the missing link that makes the retry pipeline a poll-then-resolve
 * loop rather than a delay-then-abandon loop.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RetryConsumer {

    private final TransactionRepository transactionRepository;
    private final TransactionEventRepository transactionEventRepository;
    private final List<PaymentProviderPort> providers;
    private final RetryPublisher retryPublisher;
    private final PaymentSucceededPublisher paymentSucceededPublisher;

    @RabbitListener(queues = "${rabbitmq.queues.webhook}")
    @Transactional
    public void handleRetry(RetryMessage message) {
        UUID txId = message.getTransactionId();
        int attempt = message.getAttemptNumber();

        log.info("[retry] consumer woke for transactionId={} attempt={}", txId, attempt);

        Transaction tx = transactionRepository.findById(txId).orElse(null);
        if (tx == null) {
            log.error("[retry] transaction {} not found — dropping message", txId);
            return;
        }

        // If already resolved (webhook arrived first), nothing to do
        PaymentStatus current = tx.getStatus();
        if (current != PaymentStatus.PENDING && current != PaymentStatus.PROCESSING) {
            log.info("[retry] transaction {} already resolved as {} — skipping", txId, current);
            return;
        }

        // Poll the provider for actual status
        PaymentStatus polledStatus = pollProvider(tx);

        if (polledStatus == PaymentStatus.SUCCESS || polledStatus == PaymentStatus.FAILED) {
            tx.setStatus(polledStatus);
            transactionRepository.save(tx);
            writeEvent(txId, "RETRY_RESOLVED",
                    "Status confirmed as " + polledStatus + " on attempt " + attempt);
            if (polledStatus == PaymentStatus.SUCCESS) {
                paymentSucceededPublisher.publish(tx);
            }
            log.info("[retry] transactionId={} resolved as {} on attempt={}", txId, polledStatus, attempt);
            return;
        }

        // Still pending — schedule the next retry (DlqConsumer handles attempt 4+)
        int nextAttempt = attempt + 1;
        retryPublisher.publish(txId, nextAttempt);
        writeEvent(txId, "RETRY_SCHEDULED", "Attempt " + nextAttempt + " queued after inconclusive poll");
        log.info("[retry] transactionId={} still pending — queued attempt={}", txId, nextAttempt);
    }

    private PaymentStatus pollProvider(Transaction tx) {
        return providers.stream()
                .filter(p -> p.getProvider() == tx.getProvider())
                .findFirst()
                .map(p -> {
                    try {
                        PaymentStatusResult result = p.queryPaymentStatus(tx.getProviderTransactionId());
                        return result.getStatus();
                    } catch (Exception e) {
                        log.warn("[retry] queryPaymentStatus failed for provider={} txId={}: {}",
                                tx.getProvider(), tx.getId(), e.getMessage());
                        return PaymentStatus.PROCESSING; // treat poll failure as still-pending
                    }
                })
                .orElseGet(() -> {
                    log.warn("[retry] no adapter found for provider={}", tx.getProvider());
                    return PaymentStatus.PROCESSING;
                });
    }

    private void writeEvent(UUID txId, String type, String description) {
        TransactionEvent event = new TransactionEvent();
        event.setTransactionId(txId);
        event.setEventType(type);
        event.setDescription(description);
        transactionEventRepository.save(event);
    }
}
