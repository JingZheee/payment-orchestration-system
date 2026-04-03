package com.paymentorchestration.domain.repository;

import com.paymentorchestration.domain.entity.TransactionEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransactionEventRepository extends JpaRepository<TransactionEvent, UUID> {

    List<TransactionEvent> findByTransactionIdOrderByCreatedAtAsc(UUID transactionId);
}
