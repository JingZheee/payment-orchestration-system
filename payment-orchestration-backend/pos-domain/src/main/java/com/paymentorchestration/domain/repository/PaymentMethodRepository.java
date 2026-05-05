package com.paymentorchestration.domain.repository;

import com.paymentorchestration.domain.entity.PaymentMethodEntity;
import com.paymentorchestration.domain.entity.PaymentMethodId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentMethodRepository extends JpaRepository<PaymentMethodEntity, PaymentMethodId> {

    List<PaymentMethodEntity> findByRegionAndActiveTrue(String region);

    List<PaymentMethodEntity> findAllByOrderByRegionAscCodeAsc();

    boolean existsByCodeAndRegion(String code, String region);
}
