package com.paymentorchestration.routing.scorer;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.domain.entity.ProviderMetrics;
import com.paymentorchestration.domain.repository.ProviderMetricsRepository;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import com.paymentorchestration.routing.dto.RoutingContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProviderScorerTest {

    @Mock
    private ProviderMetricsRepository metricsRepository;

    private ProviderScorer scorer;

    @BeforeEach
    void setUp() {
        ScorerProperties props = new ScorerProperties();
        // use defaults: sr=0.50, fee=0.30, latency=0.20
        scorer = new ProviderScorer(metricsRepository, props);
    }

    @Test
    void scoreIsInZeroToOneRange() {
        PaymentProviderPort p = providerWithFee(Provider.BILLPLZ, "2.50");
        metricsStub(Provider.BILLPLZ, Region.MY, "0.95", 200L);

        RoutingContext context = contextFor(Region.MY, new BigDecimal("100.00"));
        BigDecimal score = scorer.score(p, context, List.of(p));

        assertThat(score).isBetween(BigDecimal.ZERO, BigDecimal.ONE);
    }

    @Test
    void higherSuccessRateProducesHigherScore() {
        PaymentProviderPort high = providerWithFee(Provider.BILLPLZ, "2.50");
        PaymentProviderPort low  = providerWithFee(Provider.MOCK, "2.50");

        metricsStub(Provider.BILLPLZ, Region.MY, "0.98", 300L);
        metricsStub(Provider.MOCK,    Region.MY, "0.60", 300L);

        RoutingContext context = contextFor(Region.MY, new BigDecimal("100.00"));
        List<PaymentProviderPort> eligible = List.of(high, low);

        BigDecimal scoreHigh = scorer.score(high, context, eligible);
        BigDecimal scoreLow  = scorer.score(low, context, eligible);

        assertThat(scoreHigh).isGreaterThan(scoreLow);
    }

    @Test
    void lowerFeeProducesHigherScore() {
        PaymentProviderPort cheap     = providerWithFee(Provider.BILLPLZ, "1.00");
        PaymentProviderPort expensive = providerWithFee(Provider.MOCK, "5.00");

        // same success rate and latency so only fee differs
        metricsStub(Provider.BILLPLZ, Region.MY, "0.90", 300L);
        metricsStub(Provider.MOCK,    Region.MY, "0.90", 300L);

        RoutingContext context = contextFor(Region.MY, new BigDecimal("100.00"));
        List<PaymentProviderPort> eligible = List.of(cheap, expensive);

        BigDecimal scoreCheap     = scorer.score(cheap, context, eligible);
        BigDecimal scoreExpensive = scorer.score(expensive, context, eligible);

        assertThat(scoreCheap).isGreaterThan(scoreExpensive);
    }

    @Test
    void defaultsAppliedWhenNoMetricsExist() {
        when(metricsRepository.findTopByProviderAndRegionOrderByWindowEndDesc(any(), any()))
                .thenReturn(Optional.empty());

        PaymentProviderPort p = providerWithFee(Provider.BILLPLZ, "2.50");
        RoutingContext context = contextFor(Region.MY, new BigDecimal("100.00"));

        // should not throw — defaults kick in (successRate=0.5, latency=500ms)
        BigDecimal score = scorer.score(p, context, List.of(p));
        assertThat(score).isBetween(BigDecimal.ZERO, BigDecimal.ONE);
    }

    // --- helpers ---

    private PaymentProviderPort providerWithFee(Provider provider, String fee) {
        PaymentProviderPort p = mock(PaymentProviderPort.class);
        when(p.getProvider()).thenReturn(provider);
        when(p.calculateFee(any(BigDecimal.class))).thenReturn(new BigDecimal(fee));
        return p;
    }

    private void metricsStub(Provider provider, Region region, String successRate, long latencyMs) {
        ProviderMetrics m = new ProviderMetrics();
        m.setProvider(provider);
        m.setRegion(region);
        m.setSuccessRate(new BigDecimal(successRate));
        m.setAvgLatencyMs(latencyMs);
        m.setTransactionCount(100);
        m.setWindowStart(Instant.now().minusSeconds(3600));
        m.setWindowEnd(Instant.now());
        when(metricsRepository.findTopByProviderAndRegionOrderByWindowEndDesc(provider, region))
                .thenReturn(Optional.of(m));
    }

    private RoutingContext contextFor(Region region, BigDecimal amount) {
        return RoutingContext.builder()
                .amount(amount)
                .currency(Currency.MYR)
                .region(region)
                .availableProviders(List.of())
                .build();
    }
}
