package com.paymentorchestration.routing.dto;

import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.PaymentMethod;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

/**
 * Input to the routing engine and all strategy implementations.
 * Contains everything needed to select the best provider for a payment.
 */
@Getter
@Builder
public class RoutingContext {

    private final BigDecimal amount;
    private final Currency currency;
    private final Region region;
    private final PaymentMethod paymentMethod;

    /**
     * All provider adapters currently available (isAvailable() == true).
     * Pre-filtered by the RoutingEngine before passing to strategies.
     */
    private final List<PaymentProviderPort> availableProviders;
}
