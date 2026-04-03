package com.paymentorchestration.routing.engine;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.exception.RoutingException;
import com.paymentorchestration.domain.entity.RoutingRule;
import com.paymentorchestration.domain.repository.RoutingRuleRepository;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import com.paymentorchestration.routing.dto.RoutingContext;
import com.paymentorchestration.routing.dto.RoutingDecision;
import com.paymentorchestration.routing.scorer.ProviderScorer;
import com.paymentorchestration.routing.strategy.ProviderRegionSupport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Central routing engine called by PaymentService for every new payment.
 *
 * Decision flow:
 *   1. Filter all providers to those that support the region AND are available.
 *   2. Iterate enabled routing rules (ordered by priority ASC).
 *      – A rule matches if its region, currency, and amount range constraints
 *        are satisfied AND the preferred provider is in the eligible set.
 *      – First matching rule wins; its preferred provider is returned.
 *   3. If no rule matches, score all eligible providers via ProviderScorer
 *      (composite: success_rate 50% + fee 30% + latency 20%) and pick the best.
 *   4. If the eligible set is empty, throw RoutingException.
 *
 * Spring auto-wires all PaymentProviderPort beans (one per adapter) into the
 * List<PaymentProviderPort> constructor parameter.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RoutingEngine {

    private final RoutingRuleRepository ruleRepository;
    private final ProviderScorer scorer;

    /** All registered provider adapters — injected by Spring from the application context. */
    private final List<PaymentProviderPort> allProviders;

    /**
     * Select the best provider for the given routing context.
     *
     * @throws RoutingException if no eligible provider is available
     */
    public RoutingDecision route(RoutingContext context) {
        List<PaymentProviderPort> eligible = eligibleProviders(context);

        if (eligible.isEmpty()) {
            throw new RoutingException(
                    "No available provider for region " + context.getRegion()
                    + " currency " + context.getCurrency());
        }

        // 1. Rule-based path
        RoutingDecision ruleDecision = matchRule(context, eligible);
        if (ruleDecision != null) {
            log.info("[routing] rule → {} | reason: {}", ruleDecision.getProvider(), ruleDecision.getReason());
            return ruleDecision;
        }

        // 2. Composite-score fallback
        RoutingDecision scoreDecision = scoreAll(context, eligible);
        log.info("[routing] score → {} (score={}) | reason: {}",
                scoreDecision.getProvider(), scoreDecision.getScore(), scoreDecision.getReason());
        return scoreDecision;
    }

    // --- private helpers ---

    private List<PaymentProviderPort> eligibleProviders(RoutingContext context) {
        return allProviders.stream()
                .filter(p -> ProviderRegionSupport.supportsRegion(p.getProvider(), context.getRegion()))
                .filter(PaymentProviderPort::isAvailable)
                .collect(Collectors.toList());
    }

    private RoutingDecision matchRule(RoutingContext context, List<PaymentProviderPort> eligible) {
        Map<Provider, PaymentProviderPort> byProvider = eligible.stream()
                .collect(Collectors.toMap(PaymentProviderPort::getProvider, Function.identity()));

        for (RoutingRule rule : ruleRepository.findByEnabledTrueOrderByPriorityAsc()) {
            if (!matches(rule, context)) continue;

            PaymentProviderPort provider = byProvider.get(rule.getPreferredProvider());
            if (provider == null) continue; // preferred provider not eligible right now

            return RoutingDecision.builder()
                    .provider(rule.getPreferredProvider())
                    .strategy(com.paymentorchestration.common.enums.RoutingStrategy.REGION_BASED)
                    .reason("Rule #" + rule.getId() + " (priority=" + rule.getPriority()
                            + "): preferred=" + rule.getPreferredProvider())
                    .build();
        }
        return null;
    }

    private boolean matches(RoutingRule rule, RoutingContext context) {
        if (rule.getRegion() != null && rule.getRegion() != context.getRegion()) return false;
        if (rule.getCurrency() != null && rule.getCurrency() != context.getCurrency()) return false;
        if (rule.getMinAmount() != null && context.getAmount().compareTo(rule.getMinAmount()) < 0) return false;
        if (rule.getMaxAmount() != null && context.getAmount().compareTo(rule.getMaxAmount()) > 0) return false;
        return true;
    }

    private RoutingDecision scoreAll(RoutingContext context, List<PaymentProviderPort> eligible) {
        Map<PaymentProviderPort, BigDecimal> scores = eligible.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        p -> scorer.score(p, context, eligible)
                ));

        Map.Entry<PaymentProviderPort, BigDecimal> best = scores.entrySet().stream()
                .max(Comparator.comparing(Map.Entry::getValue))
                .orElseThrow(() -> new RoutingException(
                        "Composite scoring produced no result for region " + context.getRegion()));

        return RoutingDecision.builder()
                .provider(best.getKey().getProvider())
                .strategy(com.paymentorchestration.common.enums.RoutingStrategy.COMPOSITE_SCORE)
                .reason("Composite score: " + best.getKey().getProvider()
                        + " scored " + best.getValue() + " in region " + context.getRegion())
                .score(best.getValue())
                .build();
    }
}
