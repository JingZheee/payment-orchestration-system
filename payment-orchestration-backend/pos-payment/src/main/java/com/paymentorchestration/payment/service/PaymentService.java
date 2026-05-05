package com.paymentorchestration.payment.service;

import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.exception.PaymentNotFoundException;
import com.paymentorchestration.common.exception.ProviderException;
import com.paymentorchestration.domain.entity.Transaction;
import com.paymentorchestration.domain.entity.TransactionEvent;
import com.paymentorchestration.domain.entity.WebhookLog;
import com.paymentorchestration.domain.repository.TransactionEventRepository;
import com.paymentorchestration.domain.repository.TransactionRepository;
import com.paymentorchestration.domain.repository.WebhookLogRepository;
import com.paymentorchestration.payment.dto.InitiatePaymentRequest;
import com.paymentorchestration.payment.dto.InitiatePaymentResponse;
import com.paymentorchestration.payment.messaging.RetryPublisher;
import com.paymentorchestration.provider.dto.PaymentRequest;
import com.paymentorchestration.provider.dto.PaymentResult;
import com.paymentorchestration.provider.dto.WebhookParseResult;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import com.paymentorchestration.routing.dto.RoutingContext;
import com.paymentorchestration.routing.dto.RoutingDecision;
import com.paymentorchestration.routing.engine.RoutingEngine;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final RoutingEngine routingEngine;
    private final TransactionRepository transactionRepository;
    private final TransactionEventRepository eventRepository;
    private final WebhookLogRepository webhookLogRepository;
    private final RetryPublisher retryPublisher;
    private final List<PaymentProviderPort> allProviders;

    /** Built from allProviders on startup for O(1) lookup. */
    private Map<Provider, PaymentProviderPort> providerMap;

    @PostConstruct
    public void init() {
        this.providerMap = allProviders.stream()
                .collect(Collectors.toMap(
                        PaymentProviderPort::getProvider,
                        Function.identity()
                ));
    }

    // -------------------------------------------------------------------------
    // Initiate payment
    // -------------------------------------------------------------------------

    @Transactional
    public InitiatePaymentResponse initiatePayment(InitiatePaymentRequest request,
                                                    String idempotencyKey) {
        // 1. Route
        PaymentType paymentType = request.getPaymentType() != null
                ? request.getPaymentType()
                : PaymentType.PREMIUM_COLLECTION;

        RoutingContext context = RoutingContext.builder()
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .region(request.getRegion())
                .paymentMethod(request.getPaymentMethod())
                .paymentType(paymentType)
                .availableProviders(allProviders)
                .build();

        RoutingDecision decision = routingEngine.route(context);
        log.info("[payment] routed to {} via {} | {}", decision.getProvider(),
                decision.getStrategy(), decision.getReason());

        // 2. Persist transaction (PENDING before calling provider)
        Transaction transaction = new Transaction();
        transaction.setMerchantOrderId(request.getMerchantOrderId());
        transaction.setAmount(request.getAmount());
        transaction.setCurrency(request.getCurrency());
        transaction.setRegion(request.getRegion());
        transaction.setPaymentMethod(request.getPaymentMethod());
        transaction.setCustomerEmail(request.getCustomerEmail());
        transaction.setDescription(request.getDescription());
        transaction.setRedirectUrl(request.getRedirectUrl());
        transaction.setStatus(PaymentStatus.PENDING);
        transaction.setProvider(decision.getProvider());
        transaction.setRoutingStrategy(decision.getStrategy());
        transaction.setRoutingReason(decision.getReason());
        transaction.setIdempotencyKey(idempotencyKey);
        transaction.setPaymentType(paymentType);
        transaction.setPolicyNumber(request.getPolicyNumber());
        transaction.setClaimReference(request.getClaimReference());
        transactionRepository.save(transaction);

        writeEvent(transaction.getId(), "INITIATED",
                "Routed to " + decision.getProvider()
                + " via " + decision.getStrategy()
                + " | " + decision.getReason());

        // 3. Call provider
        PaymentProviderPort provider = providerMap.get(decision.getProvider());
        PaymentResult result;
        try {
            PaymentRequest providerRequest = PaymentRequest.builder()
                    .transactionId(transaction.getId())
                    .merchantOrderId(request.getMerchantOrderId())
                    .amount(request.getAmount())
                    .currency(request.getCurrency())
                    .region(request.getRegion())
                    .paymentMethod(request.getPaymentMethod())
                    .customerEmail(request.getCustomerEmail())
                    .description(request.getDescription())
                    .redirectUrl(request.getRedirectUrl())
                    .build();

            result = provider.initiatePayment(providerRequest);
        } catch (ProviderException e) {
            log.warn("[payment] provider {} threw: {}", decision.getProvider(), e.getMessage());
            transaction.setStatus(PaymentStatus.FAILED);
            transactionRepository.save(transaction);
            writeEvent(transaction.getId(), "PROVIDER_ERROR", e.getMessage());
            return toResponse(transaction);
        }

        // 4. Update transaction with provider result
        transaction.setStatus(result.getStatus());
        transaction.setProviderTransactionId(result.getProviderTransactionId());
        transaction.setRedirectUrl(result.getRedirectUrl());
        transaction.setFee(result.getFee());
        transactionRepository.save(transaction);

        writeEvent(transaction.getId(), "PROVIDER_RESPONSE", result.getRawResponse());

        // 5. Schedule retry if payment is still pending a webhook
        if (result.getStatus() == PaymentStatus.PROCESSING
                || result.getStatus() == PaymentStatus.PENDING) {
            retryPublisher.publish(transaction.getId(), 1);
            writeEvent(transaction.getId(), "RETRY_SCHEDULED", "Attempt 1 queued (30s)");
        }

        log.info("[payment] transactionId={} status={} provider={}",
                transaction.getId(), transaction.getStatus(), transaction.getProvider());
        return toResponse(transaction);
    }

    // -------------------------------------------------------------------------
    // Webhook handling
    // -------------------------------------------------------------------------

    @Transactional
    public void handleWebhook(WebhookParseResult parsed, boolean signatureValid) {
        WebhookLog webhookLog = new WebhookLog();
        webhookLog.setProvider(parsed.getProvider());
        webhookLog.setRawBody(parsed.getRawPayload());
        webhookLog.setSignatureValid(signatureValid);

        if (!signatureValid) {
            webhookLogRepository.save(webhookLog);
            return;
        }

        transactionRepository
                .findByProviderTransactionId(parsed.getProviderTransactionId())
                .ifPresent(transaction -> {
                    PaymentStatus previous = transaction.getStatus();
                    transaction.setStatus(parsed.getStatus());
                    transactionRepository.save(transaction);
                    writeEvent(transaction.getId(), "STATUS_UPDATED",
                            "Webhook: " + previous + " → " + parsed.getStatus()
                            + " (provider=" + parsed.getProvider() + ")");
                    webhookLog.setTransactionId(transaction.getId());
                    webhookLog.setProcessedAt(Instant.now());
                });

        webhookLogRepository.save(webhookLog);
    }

    // -------------------------------------------------------------------------
    // Query
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Transaction getTransaction(UUID id) {
        return transactionRepository.findById(id)
                .orElseThrow(() -> new PaymentNotFoundException("Transaction not found: " + id));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void writeEvent(UUID transactionId, String eventType, String description) {
        TransactionEvent event = new TransactionEvent();
        event.setTransactionId(transactionId);
        event.setEventType(eventType);
        event.setDescription(description);
        eventRepository.save(event);
    }

    private InitiatePaymentResponse toResponse(Transaction t) {
        return InitiatePaymentResponse.builder()
                .transactionId(t.getId())
                .providerTransactionId(t.getProviderTransactionId())
                .status(t.getStatus())
                .provider(t.getProvider())
                .routingStrategy(t.getRoutingStrategy())
                .routingReason(t.getRoutingReason())
                .fee(t.getFee())
                .redirectUrl(t.getRedirectUrl())
                .createdAt(t.getCreatedAt())
                .paymentType(t.getPaymentType())
                .policyNumber(t.getPolicyNumber())
                .claimReference(t.getClaimReference())
                .build();
    }
}
