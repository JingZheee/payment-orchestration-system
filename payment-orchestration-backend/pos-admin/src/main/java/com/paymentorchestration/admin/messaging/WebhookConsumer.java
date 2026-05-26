package com.paymentorchestration.admin.messaging;

import com.paymentorchestration.payment.dto.WebhookMessage;
import com.paymentorchestration.payment.service.PaymentService;
import com.paymentorchestration.provider.dto.WebhookParseResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Async consumer for inbound provider webhook events.
 *
 * WebhookController fast-acks the provider and publishes a WebhookMessage here.
 * This consumer owns the DB update: transaction status, event log, success notification.
 * On unhandled exception Spring AMQP nacks the message → it flows to webhook.dlq.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebhookConsumer {

    private final PaymentService paymentService;

    @RabbitListener(queues = "${rabbitmq.queues.webhook}")
    public void handle(WebhookMessage message) {
        log.info("[webhook-consumer] provider={} txn={} status={} signatureValid={}",
                message.getProvider(), message.getProviderTransactionId(),
                message.getStatus(), message.isSignatureValid());

        WebhookParseResult parsed = WebhookParseResult.builder()
                .provider(message.getProvider())
                .providerTransactionId(message.getProviderTransactionId())
                .status(message.getStatus())
                .rawPayload(message.getRawPayload())
                .build();

        paymentService.handleWebhook(parsed, message.isSignatureValid());
    }
}
