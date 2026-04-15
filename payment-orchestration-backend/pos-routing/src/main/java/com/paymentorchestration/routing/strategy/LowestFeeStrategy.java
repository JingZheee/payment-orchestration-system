package com.paymentorchestration.routing.strategy;

import com.paymentorchestration.routing.dto.RoutingContext;
import com.paymentorchestration.routing.dto.RoutingDecision;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.Optional;

/**
 * Selects the provider that charges the lowest fee for the given transaction amount.
 *
 * Fee is computed live via PaymentProviderPort.calculateFee(), so it reflects
 * the provider's current fee structure (percentage-based).
 */
@Component
public class LowestFeeStrategy implements RoutingStrategy {

    @Override
    public com.paymentorchestration.common.enums.RoutingStrategy getType() {
        return com.paymentorchestration.common.enums.RoutingStrategy.LOWEST_FEE;
    }

    @Override
    public Optional<RoutingDecision> select(RoutingContext context) {
        return context.getAvailableProviders().stream()
                .filter(p -> ProviderRegionSupport.supportsRegion(p.getProvider(), context.getRegion()))
                .min(Comparator.comparing(p -> p.calculateFee(context.getAmount(), context.getRegion(), context.getPaymentMethod())))
                .map(p -> {
                    BigDecimal fee = p.calculateFee(context.getAmount(), context.getRegion(), context.getPaymentMethod());
                    return RoutingDecision.builder()
                            .provider(p.getProvider())
                            .strategy(com.paymentorchestration.common.enums.RoutingStrategy.LOWEST_FEE)
                            .reason("Lowest-fee: " + p.getProvider() + " fee=" + fee
                                    + " for amount " + context.getAmount() + " " + context.getCurrency())
                            .build();
                });
    }
}
