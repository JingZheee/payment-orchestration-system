package com.paymentorchestration.domain.repository;

import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.domain.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID>,
        JpaSpecificationExecutor<Transaction> {

    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    Optional<Transaction> findByProviderTransactionId(String providerTransactionId);

    Page<Transaction> findByStatus(PaymentStatus status, Pageable pageable);

    Page<Transaction> findByProvider(Provider provider, Pageable pageable);

    Page<Transaction> findByRegion(Region region, Pageable pageable);

    @Query("SELECT t.status, COUNT(t) FROM Transaction t GROUP BY t.status")
    List<Object[]> countGroupByStatus();

    @Query("SELECT t.provider, COUNT(t) FROM Transaction t GROUP BY t.provider")
    List<Object[]> countGroupByProvider();

    @Query("SELECT t.region, COUNT(t) FROM Transaction t GROUP BY t.region")
    List<Object[]> countGroupByRegion();
}
