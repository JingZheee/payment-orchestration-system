package com.paymentorchestration.domain.entity;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "provider_metrics")
@Getter
@Setter
public class ProviderMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2)
    private Region region;

    @Column(name = "success_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal successRate;

    @Column(name = "avg_latency_ms", nullable = false)
    private long avgLatencyMs;

    @Column(name = "transaction_count", nullable = false)
    private int transactionCount;

    @Column(name = "window_start", nullable = false)
    private Instant windowStart;

    @Column(name = "window_end", nullable = false)
    private Instant windowEnd;

    @Column(name = "fee_accuracy_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal feeAccuracyRate = BigDecimal.ONE;
}
