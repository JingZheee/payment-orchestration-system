package com.paymentorchestration.payment.messaging;

import com.paymentorchestration.payment.dto.WebhookMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebhookPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbitmq.exchanges.webhook}")
    private String webhookExchange;

    @Value("${rabbitmq.queues.webhook}")
    private String webhookQueue;

    public void publish(WebhookMessage message) {
        rabbitTemplate.convertAndSend(webhookExchange, webhookQueue, message);
        log.info("[webhook-publisher] queued provider={} txn={} signatureValid={}",
                message.getProvider(), message.getProviderTransactionId(), message.isSignatureValid());
    }
}
