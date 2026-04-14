package com.paymentorchestration.domain.repository;

import com.paymentorchestration.common.enums.PaymentMethod;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.domain.entity.ProviderFeeRate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProviderFeeRateRepository extends JpaRepository<ProviderFeeRate, Long> {

    Optional<ProviderFeeRate> findByProviderAndPaymentMethodAndActiveTrue(Provider provider, PaymentMethod paymentMethod);

    List<ProviderFeeRate> findAllByOrderByProviderAscPaymentMethodAsc();
}
