package com.paymentorchestration.admin.dto;

import com.paymentorchestration.domain.entity.DemoPolicy;
import com.paymentorchestration.domain.entity.Transaction;
import com.paymentorchestration.domain.entity.TransactionEvent;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PolicyStatusResponse(
        UUID policyId,
        String policyNumber,
        String holderName,
        String holderEmail,
        String insuranceType,
        BigDecimal amount,
        String currency,
        String region,
        String paymentMethod,
        String paymentType,
        String status,
        UUID transactionId,
        String provider,
        String routingStrategy,
        String routingReason,
        BigDecimal fee,
        Instant createdAt,
        List<EventDto> events
) {
    public record EventDto(String eventType, String description, Instant createdAt) {}

    public static PolicyStatusResponse from(DemoPolicy policy, Transaction tx, List<TransactionEvent> events) {
        List<EventDto> eventDtos = events.stream()
                .map(e -> new EventDto(e.getEventType(), e.getDescription(), e.getCreatedAt()))
                .toList();

        return new PolicyStatusResponse(
                policy.getId(),
                policy.getPolicyNumber(),
                policy.getHolderName(),
                policy.getHolderEmail(),
                policy.getInsuranceType(),
                policy.getAmount(),
                policy.getCurrency(),
                policy.getRegion(),
                policy.getPaymentMethod(),
                policy.getPaymentType(),
                policy.getStatus(),
                tx != null ? tx.getId() : null,
                tx != null && tx.getProvider() != null ? tx.getProvider().name() : null,
                tx != null && tx.getRoutingStrategy() != null ? tx.getRoutingStrategy().name() : null,
                tx != null ? tx.getRoutingReason() : null,
                tx != null ? tx.getFee() : null,
                policy.getCreatedAt(),
                eventDtos
        );
    }
}
