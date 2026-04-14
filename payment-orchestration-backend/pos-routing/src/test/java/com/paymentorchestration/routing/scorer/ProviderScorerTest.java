package com.paymentorchestration.routing.scorer;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.PaymentMethod;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.domain.entity.ProviderFeeRate;
import com.paymentorchestration.domain.entity.ProviderMetrics;
import com.paymentorchestration.domain.repository.ProviderFeeRateRepository;
import com.paymentorchestration.domain.repository.ProviderMetricsRepository;
import com.paymentorchestration.domain.repository.ReconStatementRepository;
import com.paymentorchestration.common.enums.FeeType;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import com.paymentorchestration.routing.dto.RoutingContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProviderScorerTest {

    @Mock private ProviderMetricsRepository metricsRepository;
    @Mock private ReconStatementRepository  reconRepository;
    @Mock private ProviderFeeRateRepository feeRateRepository;

    private ProviderScorer scorer;

    @BeforeEach
    void setUp() {
        ScorerProperties props = new ScorerProperties();
        // use new defaults: sr=0.40, fee=0.25, latency=0.15, accuracy=0.20
        scorer = new ProviderScorer(metricsRepository, reconRepository, feeRateRepository, props);

        // Default: no recon history (triggers fallback to feeRateRepository)
        when(reconRepository.countByPaymentMethodForProvider(any())).thenReturn(List.of());
    }

    @Test
    void scoreIsInZeroToOneRange() {
        stubFeeRate(Provider.BILLPLZ, PaymentMethod.FPX, "2.50");
        metricsStub(Provider.BILLPLZ, Region.MY, "0.95", 200L);

        PaymentProviderPort p = provider(Provider.BILLPLZ);
        RoutingContext context = contextFor(Region.MY, new BigDecimal("100.00"));
        BigDecimal score = scorer.score(p, context, List.of(p));

        assertThat(score).isBetween(BigDecimal.ZERO, BigDecimal.ONE);
    }

    @Test
    void higherSuccessRateProducesHigherScore() {
        stubFeeRate(Provider.BILLPLZ, PaymentMethod.FPX, "2.50");
        stubFeeRate(Provider.MOCK,    PaymentMethod.FPX, "2.50");

        metricsStub(Provider.BILLPLZ, Region.MY, "0.98", 300L);
        metricsStub(Provider.MOCK,    Region.MY, "0.60", 300L);

        PaymentProviderPort high = provider(Provider.BILLPLZ);
        PaymentProviderPort low  = provider(Provider.MOCK);
        RoutingContext context = contextFor(Region.MY, new BigDecimal("100.00"));
        List<PaymentProviderPort> eligible = List.of(high, low);

        assertThat(scorer.score(high, context, eligible)).isGreaterThan(scorer.score(low, context, eligible));
    }

    @Test
    void lowerFeeProducesHigherScore() {
        stubFeeRate(Provider.BILLPLZ, PaymentMethod.FPX, "1.00");
        stubFeeRate(Provider.MOCK,    PaymentMethod.FPX, "5.00");

        metricsStub(Provider.BILLPLZ, Region.MY, "0.90", 300L);
        metricsStub(Provider.MOCK,    Region.MY, "0.90", 300L);

        PaymentProviderPort cheap     = provider(Provider.BILLPLZ);
        PaymentProviderPort expensive = provider(Provider.MOCK);
        RoutingContext context = contextFor(Region.MY, new BigDecimal("100.00"));
        List<PaymentProviderPort> eligible = List.of(cheap, expensive);

        assertThat(scorer.score(cheap, context, eligible)).isGreaterThan(scorer.score(expensive, context, eligible));
    }

    @Test
    void defaultsAppliedWhenNoMetricsExist() {
        when(metricsRepository.findTopByProviderAndRegionOrderByWindowEndDesc(any(), any()))
                .thenReturn(Optional.empty());
        stubFeeRate(Provider.BILLPLZ, PaymentMethod.FPX, "2.50");

        PaymentProviderPort p = provider(Provider.BILLPLZ);
        RoutingContext context = contextFor(Region.MY, new BigDecimal("100.00"));

        BigDecimal score = scorer.score(p, context, List.of(p));
        assertThat(score).isBetween(BigDecimal.ZERO, BigDecimal.ONE);
    }

    // --- helpers ---

    private PaymentProviderPort provider(Provider providerEnum) {
        PaymentProviderPort p = mock(PaymentProviderPort.class);
        when(p.getProvider()).thenReturn(providerEnum);
        return p;
    }

    private void stubFeeRate(Provider provider, PaymentMethod method, String fixedFee) {
        ProviderFeeRate rate = new ProviderFeeRate();
        rate.setFeeType(FeeType.FIXED);
        rate.setFixedAmount(new BigDecimal(fixedFee));
        when(feeRateRepository.findByProviderAndPaymentMethodAndActiveTrue(provider, method))
                .thenReturn(Optional.of(rate));
    }

    private void metricsStub(Provider provider, Region region, String successRate, long latencyMs) {
        ProviderMetrics m = new ProviderMetrics();
        m.setProvider(provider);
        m.setRegion(region);
        m.setSuccessRate(new BigDecimal(successRate));
        m.setAvgLatencyMs(latencyMs);
        m.setTransactionCount(100);
        m.setFeeAccuracyRate(BigDecimal.ONE);
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
                .paymentMethod(PaymentMethod.FPX)
                .availableProviders(List.of())
                .build();
    }
}
