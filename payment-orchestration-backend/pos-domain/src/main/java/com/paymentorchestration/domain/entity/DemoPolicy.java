package com.paymentorchestration.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "demo_policies")
@Getter
@Setter
public class DemoPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "holder_name", nullable = false, length = 100)
    private String holderName;

    @Column(name = "holder_email", nullable = false, length = 100)
    private String holderEmail;

    @Column(name = "insurance_type", nullable = false, length = 50)
    private String insuranceType;

    @Column(name = "policy_number", length = 50)
    private String policyNumber;

    @Column(name = "claim_reference", length = 50)
    private String claimReference;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, length = 2)
    private String region;

    @Column(name = "payment_method", nullable = false, length = 30)
    private String paymentMethod;

    @Column(name = "payment_type", nullable = false, length = 30)
    private String paymentType;

    /** PENDING | ACTIVATED | DISBURSED */
    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "transaction_id")
    private UUID transactionId;

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
