package com.paymentorchestration.admin.messaging;

import com.paymentorchestration.admin.service.EmailNotificationService;
import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.domain.entity.Transaction;
import com.paymentorchestration.domain.entity.TransactionEvent;
import com.paymentorchestration.domain.repository.DemoPolicyRepository;
import com.paymentorchestration.domain.repository.TransactionEventRepository;
import com.paymentorchestration.domain.repository.TransactionRepository;
import com.paymentorchestration.payment.dto.RetryMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DlqConsumer {

    private final TransactionRepository transactionRepository;
    private final TransactionEventRepository transactionEventRepository;
    private final DemoPolicyRepository demoPolicyRepository;
    private final EmailNotificationService emailNotificationService;

    @RabbitListener(queues = "${rabbitmq.queues.payment-dlq}")
    public void handleDeadLetter(RetryMessage message) {
        log.warn("[dlq] Transaction {} exhausted after {} attempts — marking RETRY_EXHAUSTED",
                message.getTransactionId(), message.getAttemptNumber());

        transactionRepository.findById(message.getTransactionId()).ifPresentOrElse(tx -> {
            tx.setStatus(PaymentStatus.RETRY_EXHAUSTED);
            transactionRepository.save(tx);

            TransactionEvent event = new TransactionEvent();
            event.setTransactionId(tx.getId());
            event.setEventType("RETRY_EXHAUSTED");
            event.setDescription("Payment failed after " + message.getAttemptNumber()
                    + " retry attempts. No further retries will be made.");
            transactionEventRepository.save(event);

            log.info("[dlq] Transaction {} marked as RETRY_EXHAUSTED", tx.getId());

            sendFailureEmail(tx);
        }, () -> log.error("[dlq] Transaction {} not found in database", message.getTransactionId()));
    }

    private void sendFailureEmail(Transaction tx) {
        try {
            var policyOpt = tx.getPaymentType() == PaymentType.CLAIMS_DISBURSEMENT
                    ? demoPolicyRepository.findByClaimReference(tx.getClaimReference())
                    : demoPolicyRepository.findByPolicyNumberAndPaymentType(
                            tx.getPolicyNumber(), PaymentType.PREMIUM_COLLECTION.name());

            policyOpt.ifPresentOrElse(
                    policy -> emailNotificationService.sendPaymentFailedEmail(policy, tx),
                    () -> log.warn("[dlq] no demo policy for transactionId={} — skipping failure email", tx.getId())
            );
        } catch (Exception e) {
            log.warn("[dlq] error looking up policy for failure email transactionId={}: {}", tx.getId(), e.getMessage());
        }
    }
}
