package com.paymentorchestration.domain.entity;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.common.enums.RoutingStrategy;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "routing_rules")
@Getter
@Setter
public class RoutingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private int priority;

    @Enumerated(EnumType.STRING)
    private Region region;

    @Enumerated(EnumType.STRING)
    private Currency currency;

    @Column(name = "min_amount", precision = 19, scale = 4)
    private BigDecimal minAmount;

    @Column(name = "max_amount", precision = 19, scale = 4)
    private BigDecimal maxAmount;

    /**
     * Specific provider override. When set, this provider is returned directly if eligible.
     * Mutually exclusive with {@link #strategy} — one or the other should be set, not both.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_provider")
    private Provider preferredProvider;

    /**
     * Strategy-based selection. When set (and preferredProvider is null), the routing engine
     * delegates to the named strategy class to pick the best eligible provider.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "strategy")
    private RoutingStrategy strategy;

    @Column(name = "is_enabled", nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
