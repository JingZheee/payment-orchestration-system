package com.paymentorchestration.domain.repository;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.domain.entity.ProviderFeeRate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProviderFeeRateRepository extends JpaRepository<ProviderFeeRate, Long> {

    Optional<ProviderFeeRate> findByProviderAndRegionAndPaymentMethodAndActiveTrue(
            Provider provider, Region region, String paymentMethod);

    List<ProviderFeeRate> findAllByOrderByProviderAscRegionAscPaymentMethodAsc();
}
