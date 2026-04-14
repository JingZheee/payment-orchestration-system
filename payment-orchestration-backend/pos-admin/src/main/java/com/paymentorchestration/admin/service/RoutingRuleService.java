package com.paymentorchestration.admin.service;

import com.paymentorchestration.admin.dto.RoutingRuleRequest;
import com.paymentorchestration.common.exception.PosException;
import com.paymentorchestration.domain.entity.RoutingRule;
import com.paymentorchestration.domain.repository.RoutingRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoutingRuleService {

    private final RoutingRuleRepository routingRuleRepository;

    public List<RoutingRule> findAll() {
        return routingRuleRepository.findAll();
    }

    public RoutingRule create(RoutingRuleRequest request) {
        RoutingRule rule = new RoutingRule();
        applyRequest(rule, request);
        return routingRuleRepository.save(rule);
    }

    public RoutingRule update(Long id, RoutingRuleRequest request) {
        RoutingRule rule = routingRuleRepository.findById(id)
                .orElseThrow(() -> new PosException("Routing rule not found: " + id, HttpStatus.NOT_FOUND));
        applyRequest(rule, request);
        return routingRuleRepository.save(rule);
    }

    public void delete(Long id) {
        if (!routingRuleRepository.existsById(id)) {
            throw new PosException("Routing rule not found: " + id, HttpStatus.NOT_FOUND);
        }
        routingRuleRepository.deleteById(id);
    }

    private void applyRequest(RoutingRule rule, RoutingRuleRequest request) {
        rule.setPriority(request.priority());
        rule.setRegion(request.region());
        rule.setCurrency(request.currency());
        rule.setMinAmount(request.minAmount());
        rule.setMaxAmount(request.maxAmount());
        rule.setPreferredProvider(request.preferredProvider());
        rule.setStrategy(request.strategy());
        rule.setEnabled(request.enabled());
    }
}
