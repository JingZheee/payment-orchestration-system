package com.paymentorchestration.domain.entity;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.common.enums.RoutingStrategy;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Getter
@Setter
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "merchant_order_id", nullable = false)
    private String merchantOrderId;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 3)
    private Currency currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2)
    private Region region;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Column(name = "routing_reason")
    private String routingReason;

    @Column(name = "routing_strategy")
    @Enumerated(EnumType.STRING)
    private RoutingStrategy routingStrategy;

    @Column(name = "provider_transaction_id")
    private String providerTransactionId;

    @Column(name = "redirect_url")
    private String redirectUrl;

    @Column(precision = 19, scale = 4)
    private BigDecimal fee;

    @Column(name = "customer_email")
    private String customerEmail;

    private String description;

    @Column(name = "idempotency_key", unique = true)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", length = 30)
    private PaymentType paymentType;

    @Column(name = "policy_number", length = 100)
    private String policyNumber;

    @Column(name = "claim_reference", length = 100)
    private String claimReference;

    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
