package com.paymentorchestration.domain.entity;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "recon_statements")
@Getter
@Setter
public class ReconStatement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "region")
    private Region region;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Column(name = "transaction_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal transactionAmount;

    @Column(name = "expected_fee", precision = 19, scale = 4)
    private BigDecimal expectedFee;

    @Column(name = "actual_fee", precision = 19, scale = 4)
    private BigDecimal actualFee;

    @Column(precision = 19, scale = 4)
    private BigDecimal variance;

    @Column(name = "variance_pct", precision = 7, scale = 4)
    private BigDecimal variancePct;

    @Column(name = "is_anomaly", nullable = false)
    private boolean anomaly = false;

    @Column(name = "statement_date")
    private LocalDate statementDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() { createdAt = Instant.now(); }
}
