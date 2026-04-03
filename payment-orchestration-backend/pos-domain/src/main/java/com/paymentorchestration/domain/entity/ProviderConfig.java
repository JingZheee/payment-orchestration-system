package com.paymentorchestration.domain.entity;

import com.paymentorchestration.common.enums.Provider;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "provider_configs")
@Getter
@Setter
public class ProviderConfig {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider;

    @Column(name = "is_enabled", nullable = false)
    private boolean enabled;

    @Column(name = "fee_percentage", nullable = false, precision = 5, scale = 4)
    private BigDecimal feePercentage;

    @Column(name = "webhook_secret")
    private String webhookSecret;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
