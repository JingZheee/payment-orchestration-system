package com.paymentorchestration.routing.strategy;

import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;

import java.util.Map;
import java.util.Set;

/**
 * Static mapping of each provider to the regions it serves.
 *
 * BILLPLZ  → MY (Malaysia, FPX bank transfer)
 * MIDTRANS → ID (Indonesia, Virtual Account / QRIS)
 * PAYMONGO → PH (Philippines, Maya / cards / e-wallets)
 * MOCK     → MY, ID, PH (all regions, for testing)
 *
 * Package-visible only — accessed by strategies and the routing engine
 * within the same module.
 */
public final class ProviderRegionSupport {

    public static final Map<Provider, Set<Region>> PROVIDER_REGIONS = Map.of(
            Provider.BILLPLZ,  Set.of(Region.MY),
            Provider.MIDTRANS, Set.of(Region.ID),
            Provider.PAYMONGO, Set.of(Region.PH),
            Provider.MOCK,     Set.of(Region.MY, Region.ID, Region.PH)
    );

    public static boolean supportsRegion(Provider provider, Region region) {
        Set<Region> supported = PROVIDER_REGIONS.get(provider);
        return supported != null && supported.contains(region);
    }

    private ProviderRegionSupport() {}
}
