package com.paymentorchestration.admin.controller;

import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.domain.repository.ProviderMetricsRepository;
import com.paymentorchestration.domain.repository.TransactionRepository;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import com.paymentorchestration.routing.dto.RoutingContext;
import com.paymentorchestration.routing.dto.RoutingDecision;
import com.paymentorchestration.routing.dto.ScoreDetail;
import com.paymentorchestration.routing.scorer.ProviderScorer;
import com.paymentorchestration.routing.strategy.ProviderRegionSupport;
import com.paymentorchestration.routing.strategy.RoutingStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Dashboard APIs — live scoring, strategy comparison, and transaction summary.
 *
 * GET /api/v1/admin/dashboard/transactions/summary
 *     Total count + breakdown by status, provider, and region.
 *
 * GET /api/v1/admin/dashboard/scores?region=MY&amount=100.00&currency=MYR
 *     Composite score with full component breakdown for every eligible provider.
 *
 * GET /api/v1/admin/dashboard/strategy-comparison?region=MY&amount=100.00&currency=MYR
 *     Which provider each routing strategy (REGION_BASED, LOWEST_FEE, SUCCESS_RATE,
 *     COMPOSITE_SCORE) would select for the given parameters.
 */
@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final TransactionRepository transactionRepository;
    private final ProviderMetricsRepository providerMetricsRepository;
    private final ProviderScorer providerScorer;
    private final List<PaymentProviderPort> allProviders;
    private final List<RoutingStrategy> allStrategies;

    // ── Transaction summary ─────────────────────────────────────────────────────

    @GetMapping("/transactions/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> transactionSummary() {

        long total = transactionRepository.count();

        Map<String, Long> byStatus = transactionRepository.countGroupByStatus().stream()
                .collect(Collectors.toMap(
                        row -> ((PaymentStatus) row[0]).name(),
                        row -> (Long) row[1]
                ));

        Map<String, Long> byProvider = transactionRepository.countGroupByProvider().stream()
                .collect(Collectors.toMap(
                        row -> ((Provider) row[0]).name(),
                        row -> (Long) row[1]
                ));

        Map<String, Long> byRegion = transactionRepository.countGroupByRegion().stream()
                .collect(Collectors.toMap(
                        row -> ((Region) row[0]).name(),
                        row -> (Long) row[1]
                ));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("total", total);
        summary.put("byStatus", byStatus);
        summary.put("byProvider", byProvider);
        summary.put("byRegion", byRegion);

        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    // ── Live composite scores ───────────────────────────────────────────────────

    /**
     * Returns the composite score breakdown for every provider eligible for the
     * given region, sorted best-to-worst.
     *
     * @param region        e.g. MY, ID, PH
     * @param amount        transaction amount (used for fee calculation)
     * @param currency      ISO currency code
     * @param paymentMethod optional — used as fallback when no recon data exists
     */
    @GetMapping("/scores")
    public ResponseEntity<ApiResponse<List<ScoreDetail>>> scores(
            @RequestParam Region region,
            @RequestParam BigDecimal amount,
            @RequestParam Currency currency,
            @RequestParam(required = false) String paymentMethod) {

        List<PaymentProviderPort> eligible = eligibleProviders(region);

        RoutingContext context = RoutingContext.builder()
                .amount(amount)
                .currency(currency)
                .region(region)
                .paymentMethod(paymentMethod)
                .availableProviders(eligible)
                .build();

        List<ScoreDetail> scores = eligible.stream()
                .map(p -> providerScorer.scoreDetail(p, context, eligible))
                .sorted(Comparator.comparing(ScoreDetail::totalScore).reversed())
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(scores));
    }

    // ── Strategy comparison ─────────────────────────────────────────────────────

    /**
     * Runs all 4 routing strategies against the same context and returns which
     * provider each strategy would select.
     * Useful for the admin dashboard to show "what would change if we switched strategies".
     */
    @GetMapping("/strategy-comparison")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> strategyComparison(
            @RequestParam Region region,
            @RequestParam BigDecimal amount,
            @RequestParam Currency currency,
            @RequestParam(required = false) String paymentMethod) {

        List<PaymentProviderPort> eligible = eligibleProviders(region);

        RoutingContext context = RoutingContext.builder()
                .amount(amount)
                .currency(currency)
                .region(region)
                .paymentMethod(paymentMethod)
                .availableProviders(eligible)
                .build();

        List<Map<String, String>> results = allStrategies.stream()
                .map(strategy -> {
                    Optional<RoutingDecision> decision = strategy.select(context);
                    Map<String, String> row = new LinkedHashMap<>();
                    row.put("strategy", strategy.getType().name());
                    row.put("selectedProvider", decision.map(d -> d.getProvider().name()).orElse("NONE"));
                    row.put("reason", decision.map(RoutingDecision::getReason).orElse("No eligible provider"));
                    return row;
                })
                .collect(Collectors.toList());

        // Add composite scorer as a pseudo-strategy entry
        if (!eligible.isEmpty()) {
            eligible.stream()
                    .max(Comparator.comparing(p -> providerScorer.score(p, context, eligible)))
                    .ifPresent(best -> {
                        BigDecimal bestScore = providerScorer.score(best, context, eligible);
                        Map<String, String> row = new LinkedHashMap<>();
                        row.put("strategy", "COMPOSITE_SCORE");
                        row.put("selectedProvider", best.getProvider().name());
                        row.put("reason", "Composite score: " + best.getProvider()
                                + " scored " + bestScore + " (sr+fee+latency+accuracy)");
                        results.add(row);
                    });
        }

        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

    private List<PaymentProviderPort> eligibleProviders(Region region) {
        return allProviders.stream()
                .filter(PaymentProviderPort::isAvailable)
                .filter(p -> ProviderRegionSupport.supportsRegion(p.getProvider(), region))
                .collect(Collectors.toList());
    }
}
