package com.paymentorchestration.routing.strategy;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import com.paymentorchestration.routing.dto.RoutingContext;
import com.paymentorchestration.routing.dto.RoutingDecision;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LowestFeeStrategyTest {

    private static final BigDecimal AMOUNT = new BigDecimal("500.00");

    private LowestFeeStrategy strategy;

    @BeforeEach
    void setUp() {
        strategy = new LowestFeeStrategy();
    }

    @Test
    void selectsProviderWithLowestFee() {
        PaymentProviderPort billplz = providerWithFee(Provider.BILLPLZ, Region.MY, "2.50");
        PaymentProviderPort mock    = providerWithFee(Provider.MOCK, Region.MY, "5.00");

        RoutingContext context = contextFor(Region.MY, List.of(billplz, mock));
        Optional<RoutingDecision> decision = strategy.select(context);

        assertThat(decision).isPresent();
        assertThat(decision.get().getProvider()).isEqualTo(Provider.BILLPLZ);
        assertThat(decision.get().getStrategy())
                .isEqualTo(com.paymentorchestration.common.enums.RoutingStrategy.LOWEST_FEE);
    }

    @Test
    void ignoresProvidersNotSupportingRegion() {
        PaymentProviderPort midtrans = providerWithFee(Provider.MIDTRANS, Region.ID, "1.00"); // ID, not MY
        PaymentProviderPort mock     = providerWithFee(Provider.MOCK, Region.MY, "5.00");

        RoutingContext context = contextFor(Region.MY, List.of(midtrans, mock));
        Optional<RoutingDecision> decision = strategy.select(context);

        assertThat(decision).isPresent();
        assertThat(decision.get().getProvider()).isEqualTo(Provider.MOCK);
    }

    @Test
    void returnsEmptyWhenNoEligibleProvider() {
        PaymentProviderPort midtrans = providerWithFee(Provider.MIDTRANS, Region.ID, "1.00");

        RoutingContext context = contextFor(Region.MY, List.of(midtrans));
        Optional<RoutingDecision> decision = strategy.select(context);

        assertThat(decision).isEmpty();
    }

    // --- helpers ---

    private PaymentProviderPort providerWithFee(Provider provider, Region region, String fee) {
        PaymentProviderPort p = mock(PaymentProviderPort.class);
        when(p.getProvider()).thenReturn(provider);
        when(p.calculateFee(any(BigDecimal.class), any(), any())).thenReturn(new BigDecimal(fee));
        return p;
    }

    private RoutingContext contextFor(Region region, List<PaymentProviderPort> providers) {
        return RoutingContext.builder()
                .amount(AMOUNT)
                .currency(Currency.MYR)
                .region(region)
                .paymentMethod("FPX")
                .availableProviders(providers)
                .build();
    }
}
