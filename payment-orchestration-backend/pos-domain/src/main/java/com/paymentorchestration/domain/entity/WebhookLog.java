package com.paymentorchestration.domain.entity;

import com.paymentorchestration.common.enums.Provider;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "webhook_logs")
@Getter
@Setter
public class WebhookLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @Column(name = "raw_body", columnDefinition = "TEXT", nullable = false)
    private String rawBody;

    @Column(name = "signature_valid", nullable = false)
    private boolean signatureValid;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    @PrePersist
    void prePersist() {
        receivedAt = Instant.now();
    }
}
