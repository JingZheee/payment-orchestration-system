package com.paymentorchestration.domain.repository;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.domain.entity.ReconStatement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ReconStatementRepository extends JpaRepository<ReconStatement, Long> {

    Page<ReconStatement> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<ReconStatement> findByProviderOrderByCreatedAtDesc(Provider provider, Pageable pageable);

    Page<ReconStatement> findByAnomalyTrueOrderByCreatedAtDesc(Pageable pageable);

    Page<ReconStatement> findByProviderAndAnomalyTrueOrderByCreatedAtDesc(Provider provider, Pageable pageable);

    /**
     * Returns [paymentMethod, count] pairs for volume-weighted fee calculation.
     */
    @Query("SELECT r.paymentMethod, COUNT(r) FROM ReconStatement r WHERE r.provider = :provider GROUP BY r.paymentMethod")
    List<Object[]> countByPaymentMethodForProvider(@Param("provider") Provider provider);

    /**
     * Average fee accuracy for a provider since a given timestamp.
     * accuracy = 1 - |variance| / expectedFee per record.
     */
    @Query("""
           SELECT AVG(1.0 - ABS(r.variance) / r.expectedFee)
           FROM ReconStatement r
           WHERE r.provider = :provider
             AND r.createdAt > :since
             AND r.expectedFee IS NOT NULL
             AND r.expectedFee > 0
           """)
    Optional<BigDecimal> calculateAvgAccuracy(@Param("provider") Provider provider,
                                              @Param("since") Instant since);
}
