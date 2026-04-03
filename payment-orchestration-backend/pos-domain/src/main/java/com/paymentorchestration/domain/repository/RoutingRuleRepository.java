package com.paymentorchestration.domain.repository;

import com.paymentorchestration.domain.entity.RoutingRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoutingRuleRepository extends JpaRepository<RoutingRule, Long> {

    List<RoutingRule> findByEnabledTrueOrderByPriorityAsc();
}
