package com.paymentorchestration.domain.repository;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.domain.entity.ProviderFeeRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProviderFeeRateRepository extends JpaRepository<ProviderFeeRate, Long> {

    Optional<ProviderFeeRate> findByProviderAndRegionAndPaymentMethodAndActiveTrue(
            Provider provider, Region region, String paymentMethod);

    List<ProviderFeeRate> findAllByOrderByProviderAscRegionAscPaymentMethodAsc();

    boolean existsByProviderAndRegionAndPaymentMethod(Provider provider, Region region, String paymentMethod);

    @Query("SELECT DISTINCT f.paymentMethod FROM ProviderFeeRate f WHERE f.provider = :provider AND f.active = true ORDER BY f.paymentMethod")
    List<String> findActiveMethodsByProvider(@Param("provider") Provider provider);
}
