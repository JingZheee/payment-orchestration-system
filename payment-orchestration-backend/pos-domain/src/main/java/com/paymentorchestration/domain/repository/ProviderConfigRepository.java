package com.paymentorchestration.domain.repository;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.domain.entity.ProviderConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProviderConfigRepository extends JpaRepository<ProviderConfig, Provider> {

    List<ProviderConfig> findByEnabledTrue();
}
