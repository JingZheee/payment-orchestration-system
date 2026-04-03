package com.paymentorchestration.domain.repository;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.domain.entity.ProviderMetrics;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ProviderMetricsRepository extends JpaRepository<ProviderMetrics, Long> {

    Optional<ProviderMetrics> findTopByProviderAndRegionOrderByWindowEndDesc(Provider provider, Region region);

    List<ProviderMetrics> findByWindowStartAfter(Instant since);
}
