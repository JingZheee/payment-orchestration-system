package com.paymentorchestration.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "payment_methods")
@IdClass(PaymentMethodId.class)
@Getter
@Setter
public class PaymentMethodEntity {

    @Id
    @Column(name = "code", length = 30, nullable = false)
    private String code;

    @Id
    @Column(name = "region", length = 10, nullable = false)
    private String region;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
