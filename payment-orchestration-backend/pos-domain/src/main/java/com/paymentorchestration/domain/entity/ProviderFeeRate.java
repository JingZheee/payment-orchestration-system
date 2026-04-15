package com.paymentorchestration.domain.entity;

import com.paymentorchestration.common.enums.FeeType;
import com.paymentorchestration.common.enums.PaymentMethod;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

@Entity
@Table(
    name = "provider_fee_rates",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_provider_region_payment_method",
        columnNames = {"provider", "region", "payment_method"}
    )
)
@Getter
@Setter
public class ProviderFeeRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Region region;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "fee_type", nullable = false)
    private FeeType feeType;

    @Column(name = "fixed_amount", precision = 19, scale = 4)
    private BigDecimal fixedAmount;

    @Column(name = "percentage", precision = 7, scale = 6)
    private BigDecimal percentage;

    @Column(nullable = false, length = 5)
    private String currency;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() { updatedAt = Instant.now(); }

    /**
     * Compute the fee for the given transaction amount according to this rate's fee type.
     */
    public BigDecimal compute(BigDecimal amount) {
        return switch (feeType) {
            case FIXED -> fixedAmount != null ? fixedAmount : BigDecimal.ZERO;
            case PERCENTAGE -> percentage != null
                    ? amount.multiply(percentage).setScale(4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            case FIXED_PLUS_PERCENTAGE -> {
                BigDecimal pct = percentage != null
                        ? amount.multiply(percentage).setScale(4, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;
                yield (fixedAmount != null ? fixedAmount : BigDecimal.ZERO).add(pct);
            }
        };
    }
}
