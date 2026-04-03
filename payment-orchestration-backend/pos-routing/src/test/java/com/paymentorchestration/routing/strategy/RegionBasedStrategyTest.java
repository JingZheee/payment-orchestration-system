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
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RegionBasedStrategyTest {

    private RegionBasedStrategy strategy;

    @BeforeEach
    void setUp() {
        strategy = new RegionBasedStrategy();
    }

    @Test
    void selectsFirstProviderMatchingRegion() {
        PaymentProviderPort billplz = providerFor(Provider.BILLPLZ);
        PaymentProviderPort mock = providerFor(Provider.MOCK);

        RoutingContext context = contextFor(Region.MY, List.of(billplz, mock));
        Optional<RoutingDecision> decision = strategy.select(context);

        assertThat(decision).isPresent();
        assertThat(decision.get().getProvider()).isEqualTo(Provider.BILLPLZ);
        assertThat(decision.get().getStrategy())
                .isEqualTo(com.paymentorchestration.common.enums.RoutingStrategy.REGION_BASED);
    }

    @Test
    void skipsProvidersNotSupportingRegion() {
        PaymentProviderPort midtrans = providerFor(Provider.MIDTRANS); // ID only
        PaymentProviderPort mock = providerFor(Provider.MOCK);         // all regions

        RoutingContext context = contextFor(Region.MY, List.of(midtrans, mock));
        Optional<RoutingDecision> decision = strategy.select(context);

        assertThat(decision).isPresent();
        assertThat(decision.get().getProvider()).isEqualTo(Provider.MOCK);
    }

    @Test
    void returnsEmptyWhenNoProviderSupportsRegion() {
        PaymentProviderPort midtrans = providerFor(Provider.MIDTRANS);
        PaymentProviderPort paymongo = providerFor(Provider.PAYMONGO);

        RoutingContext context = contextFor(Region.MY, List.of(midtrans, paymongo));
        Optional<RoutingDecision> decision = strategy.select(context);

        assertThat(decision).isEmpty();
    }

    @Test
    void returnsEmptyWhenNoProvidersAvailable() {
        RoutingContext context = contextFor(Region.MY, List.of());
        Optional<RoutingDecision> decision = strategy.select(context);

        assertThat(decision).isEmpty();
    }

    // --- helpers ---

    private PaymentProviderPort providerFor(Provider provider) {
        PaymentProviderPort p = mock(PaymentProviderPort.class);
        when(p.getProvider()).thenReturn(provider);
        return p;
    }

    private RoutingContext contextFor(Region region, List<PaymentProviderPort> providers) {
        return RoutingContext.builder()
                .amount(new BigDecimal("100.00"))
                .currency(Currency.MYR)
                .region(region)
                .availableProviders(providers)
                .build();
    }
}
