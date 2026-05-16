package com.paymentorchestration.payment.messaging;

import com.paymentorchestration.domain.entity.Transaction;
import com.paymentorchestration.payment.dto.PaymentSucceededEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentSucceededPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbitmq.exchanges.notification}")
    private String notificationExchange;

    @Value("${rabbitmq.queues.notification}")
    private String notificationQueue;

    public void publish(Transaction tx) {
        PaymentSucceededEvent event = PaymentSucceededEvent.builder()
                .transactionId(tx.getId())
                .merchantOrderId(tx.getMerchantOrderId())
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .region(tx.getRegion())
                .provider(tx.getProvider())
                .paymentType(tx.getPaymentType())
                .policyNumber(tx.getPolicyNumber())
                .claimReference(tx.getClaimReference())
                .succeededAt(Instant.now())
                .build();

        rabbitTemplate.convertAndSend(notificationExchange, notificationQueue, event);
        log.info("[notification] published PaymentSucceededEvent transactionId={} paymentType={}",
                tx.getId(), tx.getPaymentType());
    }
}
