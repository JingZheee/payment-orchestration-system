package com.paymentorchestration.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "store_products")
@Getter
@Setter
public class StoreProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "insurance_type", nullable = false, length = 60)
    private String insuranceType;

    @Column(nullable = false, length = 200)
    private String tagline;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "billing_period", nullable = false, length = 20)
    private String billingPeriod;

    /** Pipe-separated feature strings, e.g. "Feature A|Feature B|Feature C" */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String features;

    @Column(length = 50)
    private String badge;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, length = 2)
    private String region;

    @Column(nullable = false, length = 3)
    private String currency;
}
