package com.paymentorchestration.admin.messaging;

import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.domain.entity.DemoPolicy;
import com.paymentorchestration.domain.entity.TransactionEvent;
import com.paymentorchestration.domain.repository.DemoPolicyRepository;
import com.paymentorchestration.domain.repository.TransactionEventRepository;
import com.paymentorchestration.payment.dto.PaymentSucceededEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationConsumer {

    private final TransactionEventRepository transactionEventRepository;
    private final DemoPolicyRepository demoPolicyRepository;

    @RabbitListener(id = "notificationConsumer", queues = "${rabbitmq.queues.notification}", autoStartup = "true")
    @Transactional
    public void handleNotification(PaymentSucceededEvent event) {
        log.info("[notification] processing PaymentSucceededEvent transactionId={} type={} provider={} region={}",
                event.getTransactionId(), event.getPaymentType(),
                event.getProvider(), event.getRegion());

        String eventType;
        String description;

        if (event.getPaymentType() == PaymentType.CLAIMS_DISBURSEMENT) {
            eventType = "CLAIM_DISBURSED";
            description = "Claim disbursement triggered for claimRef=" + event.getClaimReference()
                    + " amount=" + event.getAmount() + " " + event.getCurrency()
                    + " via " + event.getProvider();
        } else {
            eventType = "PREMIUM_ACTIVATED";
            description = "Insurance premium activated for policy=" + event.getPolicyNumber()
                    + " amount=" + event.getAmount() + " " + event.getCurrency()
                    + " via " + event.getProvider();
        }

        TransactionEvent txEvent = new TransactionEvent();
        txEvent.setTransactionId(event.getTransactionId());
        txEvent.setEventType(eventType);
        txEvent.setDescription(description);
        transactionEventRepository.save(txEvent);

        // Activate / disburse the corresponding demo policy record
        activateDemoPolicy(event, eventType);

        log.info("[notification] {} recorded for transactionId={}", eventType, event.getTransactionId());
    }

    private void activateDemoPolicy(PaymentSucceededEvent event, String eventType) {
        String newStatus = "CLAIM_DISBURSED".equals(eventType) ? "DISBURSED" : "ACTIVATED";
        try {
            java.util.Optional<DemoPolicy> found = event.getPaymentType() == PaymentType.CLAIMS_DISBURSEMENT
                    ? demoPolicyRepository.findByClaimReference(event.getClaimReference())
                    : demoPolicyRepository.findByPolicyNumberAndPaymentType(
                            event.getPolicyNumber(), PaymentType.PREMIUM_COLLECTION.name());

            found.ifPresent(policy -> {
                policy.setStatus(newStatus);
                policy.setTransactionId(event.getTransactionId());
                demoPolicyRepository.save(policy);
                log.info("[notification] demo policy id={} marked as {}", policy.getId(), newStatus);
            });
        } catch (Exception e) {
            log.warn("[notification] could not update demo policy status: {}", e.getMessage());
        }
    }
}
