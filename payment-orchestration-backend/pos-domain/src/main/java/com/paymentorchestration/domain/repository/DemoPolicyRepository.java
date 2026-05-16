package com.paymentorchestration.domain.repository;

import com.paymentorchestration.domain.entity.DemoPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DemoPolicyRepository extends JpaRepository<DemoPolicy, UUID> {

    List<DemoPolicy> findAllByOrderByCreatedAtAsc();

    Optional<DemoPolicy> findByPolicyNumberAndPaymentType(String policyNumber, String paymentType);

    Optional<DemoPolicy> findByClaimReference(String claimReference);
}
