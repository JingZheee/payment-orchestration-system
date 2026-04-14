package com.paymentorchestration.routing.engine;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.common.exception.RoutingException;
import com.paymentorchestration.domain.entity.RoutingRule;
import com.paymentorchestration.domain.repository.RoutingRuleRepository;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import com.paymentorchestration.routing.dto.RoutingContext;
import com.paymentorchestration.routing.dto.RoutingDecision;
import com.paymentorchestration.routing.scorer.ProviderScorer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RoutingEngineTest {

    @Mock
    private RoutingRuleRepository ruleRepository;

    @Mock
    private ProviderScorer scorer;

    private PaymentProviderPort billplz;
    private PaymentProviderPort mockProvider;

    private RoutingEngine engine;

    @BeforeEach
    void setUp() {
        billplz      = availableProvider(Provider.BILLPLZ);
        mockProvider = availableProvider(Provider.MOCK);

        engine = new RoutingEngine(ruleRepository, scorer, List.of(billplz, mockProvider), List.of());
    }

    @Test
    void usesMatchingRuleAndSkipsScoring() {
        RoutingRule rule = ruleFor(Provider.BILLPLZ, Region.MY, null, null, null);
        when(ruleRepository.findByEnabledTrueOrderByPriorityAsc()).thenReturn(List.of(rule));

        RoutingContext context = contextFor(Region.MY, new BigDecimal("100.00"), Currency.MYR);
        RoutingDecision decision = engine.route(context);

        assertThat(decision.getProvider()).isEqualTo(Provider.BILLPLZ);
        assertThat(decision.getStrategy())
                .isEqualTo(com.paymentorchestration.common.enums.RoutingStrategy.REGION_BASED);
    }

    @Test
    void fallsBackToScoringWhenNoRuleMatches() {
        when(ruleRepository.findByEnabledTrueOrderByPriorityAsc()).thenReturn(List.of());
        when(scorer.score(eq(billplz), any(), any())).thenReturn(new BigDecimal("0.85"));
        when(scorer.score(eq(mockProvider), any(), any())).thenReturn(new BigDecimal("0.60"));

        RoutingContext context = contextFor(Region.MY, new BigDecimal("100.00"), Currency.MYR);
        RoutingDecision decision = engine.route(context);

        assertThat(decision.getProvider()).isEqualTo(Provider.BILLPLZ);
        assertThat(decision.getStrategy())
                .isEqualTo(com.paymentorchestration.common.enums.RoutingStrategy.COMPOSITE_SCORE);
        assertThat(decision.getScore()).isEqualByComparingTo("0.85");
    }

    @Test
    void skipsRuleWhenPreferredProviderIsUnavailable() {
        PaymentProviderPort unavailable = mock(PaymentProviderPort.class);
        when(unavailable.getProvider()).thenReturn(Provider.PAYMONGO);
        when(unavailable.isAvailable()).thenReturn(false);

        RoutingEngine engineWithUnavailable = new RoutingEngine(
                ruleRepository, scorer, List.of(unavailable, mockProvider), List.of());

        RoutingRule rule = ruleFor(Provider.PAYMONGO, Region.PH, null, null, null);
        when(ruleRepository.findByEnabledTrueOrderByPriorityAsc()).thenReturn(List.of(rule));
        when(scorer.score(eq(mockProvider), any(), any())).thenReturn(new BigDecimal("0.70"));

        RoutingContext context = contextFor(Region.PH, new BigDecimal("50.00"), Currency.PHP);
        RoutingDecision decision = engineWithUnavailable.route(context);

        // PAYMONGO is unavailable, falls through to score-based which picks MOCK
        assertThat(decision.getProvider()).isEqualTo(Provider.MOCK);
        assertThat(decision.getStrategy())
                .isEqualTo(com.paymentorchestration.common.enums.RoutingStrategy.COMPOSITE_SCORE);
    }

    @Test
    void throwsWhenNoEligibleProvider() {
        // Engine with only BILLPLZ (MY), routing for PH — BILLPLZ won't match PH
        PaymentProviderPort billplzOnly = availableProvider(Provider.BILLPLZ);
        RoutingEngine phEngine = new RoutingEngine(ruleRepository, scorer, List.of(billplzOnly), List.of());
        when(ruleRepository.findByEnabledTrueOrderByPriorityAsc()).thenReturn(List.of());

        RoutingContext context = contextFor(Region.PH, new BigDecimal("100.00"), Currency.PHP);

        assertThatThrownBy(() -> phEngine.route(context))
                .isInstanceOf(RoutingException.class)
                .hasMessageContaining("PH");
    }

    @Test
    void ruleAmountRangeFiltersCorrectly() {
        RoutingRule rule = ruleFor(Provider.BILLPLZ, Region.MY,
                new BigDecimal("100.00"), new BigDecimal("500.00"), null);
        when(ruleRepository.findByEnabledTrueOrderByPriorityAsc()).thenReturn(List.of(rule));
        when(scorer.score(any(), any(), any())).thenReturn(new BigDecimal("0.50"));

        // amount within range → rule fires
        RoutingContext inRange = contextFor(Region.MY, new BigDecimal("250.00"), Currency.MYR);
        assertThat(engine.route(inRange).getProvider()).isEqualTo(Provider.BILLPLZ);

        // amount below range → falls through to scorer
        RoutingContext below = contextFor(Region.MY, new BigDecimal("50.00"), Currency.MYR);
        assertThat(engine.route(below).getStrategy())
                .isEqualTo(com.paymentorchestration.common.enums.RoutingStrategy.COMPOSITE_SCORE);
    }

    // --- helpers ---

    private PaymentProviderPort availableProvider(Provider provider) {
        PaymentProviderPort p = mock(PaymentProviderPort.class);
        when(p.getProvider()).thenReturn(provider);
        when(p.isAvailable()).thenReturn(true);
        return p;
    }

    private RoutingRule ruleFor(Provider preferredProvider, Region region,
                                 BigDecimal minAmount, BigDecimal maxAmount,
                                 Currency currency) {
        RoutingRule rule = new RoutingRule();
        rule.setPreferredProvider(preferredProvider);
        rule.setRegion(region);
        rule.setMinAmount(minAmount);
        rule.setMaxAmount(maxAmount);
        rule.setCurrency(currency);
        rule.setPriority(1);
        rule.setEnabled(true);
        return rule;
    }

    private RoutingContext contextFor(Region region, BigDecimal amount, Currency currency) {
        return RoutingContext.builder()
                .amount(amount)
                .currency(currency)
                .region(region)
                .availableProviders(List.of())
                .build();
    }
}
