package com.paymentorchestration.admin.controller;

import com.paymentorchestration.admin.dto.ProviderSummaryDto;
import com.paymentorchestration.admin.dto.RoutingRuleRequest;
import com.paymentorchestration.routing.strategy.ProviderRegionSupport;
import com.paymentorchestration.admin.service.RoutingRuleService;
import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.common.exception.PosException;
import com.paymentorchestration.domain.entity.ProviderConfig;
import com.paymentorchestration.domain.entity.ProviderMetrics;
import com.paymentorchestration.domain.entity.RoutingRule;
import com.paymentorchestration.domain.entity.Transaction;
import com.paymentorchestration.domain.entity.TransactionEvent;
import com.paymentorchestration.domain.repository.ProviderConfigRepository;
import com.paymentorchestration.domain.repository.ProviderFeeRateRepository;
import com.paymentorchestration.domain.repository.ProviderMetricsRepository;
import com.paymentorchestration.domain.repository.TransactionEventRepository;
import com.paymentorchestration.domain.repository.TransactionRepository;
import com.paymentorchestration.payment.messaging.RetryPublisher;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final RoutingRuleService routingRuleService;
    private final ProviderMetricsRepository providerMetricsRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionEventRepository transactionEventRepository;
    private final ProviderConfigRepository providerConfigRepository;
    private final ProviderFeeRateRepository providerFeeRateRepository;
    private final RetryPublisher retryPublisher;

    private record ProviderMeta(String label, String webhookType) {}

    private static final Map<Provider, ProviderMeta> PROVIDER_META = Map.of(
            Provider.BILLPLZ,  new ProviderMeta("Billplz",       "HMAC-SHA256"),
            Provider.MIDTRANS, new ProviderMeta("Midtrans",       "HMAC-SHA256"),
            Provider.PAYMONGO, new ProviderMeta("PayMongo",       "RSA Signature"),
            Provider.XENDIT,   new ProviderMeta("Xendit",         "HMAC-SHA256"),
            Provider.MOCK,     new ProviderMeta("Mock Provider",  "Always passes")
    );

    // ── Metrics ────────────────────────────────────────────────────────────────

    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<List<ProviderMetrics>>> getMetrics(
            @RequestParam(defaultValue = "60") long windowMinutes) {
        Instant since = Instant.now().minus(windowMinutes, ChronoUnit.MINUTES);
        List<ProviderMetrics> metrics = providerMetricsRepository.findByWindowEndAfter(since);
        return ResponseEntity.ok(ApiResponse.ok(metrics));
    }

    // ── Routing Rules ───────────────────────────────────────────────────────────

    @GetMapping("/routing-rules")
    public ResponseEntity<ApiResponse<List<RoutingRule>>> getRoutingRules() {
        return ResponseEntity.ok(ApiResponse.ok(routingRuleService.findAll()));
    }

    @PostMapping("/routing-rules")
    public ResponseEntity<ApiResponse<RoutingRule>> createRoutingRule(
            @Valid @RequestBody RoutingRuleRequest request) {
        RoutingRule created = routingRuleService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/routing-rules/{id}")
    public ResponseEntity<ApiResponse<RoutingRule>> updateRoutingRule(
            @PathVariable("id") Long id,
            @Valid @RequestBody RoutingRuleRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(routingRuleService.update(id, request)));
    }

    @DeleteMapping("/routing-rules/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRoutingRule(@PathVariable("id") Long id) {
        routingRuleService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Routing rule deleted"));
    }

    // ── Transactions ────────────────────────────────────────────────────────────

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<Page<Transaction>>> getTransactions(
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) Provider provider,
            @RequestParam(required = false) Region region,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Specification<Transaction> spec = Specification.where(null);
        if (status != null)
            spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), status));
        if (provider != null)
            spec = spec.and((root, q, cb) -> cb.equal(root.get("provider"), provider));
        if (region != null)
            spec = spec.and((root, q, cb) -> cb.equal(root.get("region"), region));
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> cb.like(cb.lower(root.<String>get("merchantOrderId")), pattern));
        }

        return ResponseEntity.ok(ApiResponse.ok(transactionRepository.findAll(spec, pageable)));
    }

    @GetMapping("/transactions/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTransaction(
            @PathVariable("id") UUID id) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new PosException("Transaction not found: " + id, HttpStatus.NOT_FOUND));
        List<TransactionEvent> events = transactionEventRepository
                .findByTransactionIdOrderByCreatedAtAsc(id);
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("transaction", tx);
        detail.put("events", events);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping("/transactions/{id}/requeue")
    public ResponseEntity<ApiResponse<Transaction>> requeueTransaction(@PathVariable("id") UUID id) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new PosException("Transaction not found: " + id, HttpStatus.NOT_FOUND));

        if (tx.getStatus() != PaymentStatus.RETRY_EXHAUSTED) {
            throw new PosException(
                    "Only RETRY_EXHAUSTED transactions can be re-queued — current status: " + tx.getStatus(),
                    HttpStatus.CONFLICT);
        }

        tx.setStatus(PaymentStatus.PROCESSING);
        transactionRepository.save(tx);

        TransactionEvent event = new TransactionEvent();
        event.setTransactionId(tx.getId());
        event.setEventType("REQUEUED");
        event.setDescription("Manually re-queued by admin. Retry attempt 1 scheduled (30 s delay).");
        transactionEventRepository.save(event);

        retryPublisher.publish(tx.getId(), 1);

        return ResponseEntity.ok(ApiResponse.ok(tx, "Transaction re-queued"));
    }

    // ── Provider Config ─────────────────────────────────────────────────────────

    @GetMapping("/providers")
    public ResponseEntity<ApiResponse<List<ProviderConfig>>> getProviders() {
        return ResponseEntity.ok(ApiResponse.ok(providerConfigRepository.findAll()));
    }

    @GetMapping("/providers/summary")
    public ResponseEntity<ApiResponse<List<ProviderSummaryDto>>> getProviderSummaries() {
        List<ProviderSummaryDto> summaries = providerConfigRepository.findAll().stream()
                .map(cfg -> {
                    Provider p = cfg.getProvider();
                    ProviderMeta meta = PROVIDER_META.getOrDefault(p,
                            new ProviderMeta(p.name(), "Unknown"));

                    List<String> regions = ProviderRegionSupport.PROVIDER_REGIONS
                            .getOrDefault(p, Set.of())
                            .stream().map(Region::name).sorted().toList();

                    List<Transaction> txns = transactionRepository.findAllByProvider(p);
                    int total = txns.size();

                    BigDecimal successRate = total == 0 ? null
                            : BigDecimal.valueOf(txns.stream().filter(t -> t.getStatus() == PaymentStatus.SUCCESS).count())
                                    .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP);

                    Long avgLatencyMs = total == 0 ? null
                            : (long) txns.stream()
                                    .filter(t -> t.getCreatedAt() != null && t.getUpdatedAt() != null)
                                    .mapToLong(t -> java.time.Duration.between(t.getCreatedAt(), t.getUpdatedAt()).toMillis())
                                    .filter(ms -> ms >= 0)
                                    .average().orElse(0);

                    List<String> methods = providerFeeRateRepository.findActiveMethodsByProvider(p);

                    return new ProviderSummaryDto(
                            p.name(), meta.label(), regions, meta.webhookType(),
                            cfg.isEnabled(), cfg.getUpdatedAt(),
                            successRate, avgLatencyMs, total == 0 ? null : total, methods);
                })
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(summaries));
    }

    @PostMapping("/providers/{provider}/toggle")
    public ResponseEntity<ApiResponse<ProviderConfig>> toggleProvider(
            @PathVariable("provider") Provider provider,
            @RequestParam("enabled") boolean enabled) {
        ProviderConfig config = providerConfigRepository.findById(provider)
                .orElseThrow(() -> new PosException("Provider config not found: " + provider, HttpStatus.NOT_FOUND));
        config.setEnabled(enabled);
        return ResponseEntity.ok(ApiResponse.ok(providerConfigRepository.save(config)));
    }
}
