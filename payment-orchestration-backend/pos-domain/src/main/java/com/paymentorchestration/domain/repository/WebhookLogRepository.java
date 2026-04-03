package com.paymentorchestration.domain.repository;

import com.paymentorchestration.domain.entity.WebhookLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WebhookLogRepository extends JpaRepository<WebhookLog, UUID> {
}
