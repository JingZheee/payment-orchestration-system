package com.paymentorchestration.admin.controller;

import com.paymentorchestration.admin.dto.RoutingRuleRequest;
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
import com.paymentorchestration.domain.repository.ProviderConfigRepository;
import com.paymentorchestration.domain.repository.ProviderMetricsRepository;
import com.paymentorchestration.domain.repository.TransactionRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final RoutingRuleService routingRuleService;
    private final ProviderMetricsRepository providerMetricsRepository;
    private final TransactionRepository transactionRepository;
    private final ProviderConfigRepository providerConfigRepository;

    // ── Metrics ────────────────────────────────────────────────────────────────

    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<List<ProviderMetrics>>> getMetrics(
            @RequestParam(defaultValue = "60") long windowMinutes) {
        Instant since = Instant.now().minus(windowMinutes, ChronoUnit.MINUTES);
        List<ProviderMetrics> metrics = providerMetricsRepository.findByWindowStartAfter(since);
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
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {

        Page<Transaction> page;
        if (status != null) {
            page = transactionRepository.findByStatus(status, pageable);
        } else if (provider != null) {
            page = transactionRepository.findByProvider(provider, pageable);
        } else if (region != null) {
            page = transactionRepository.findByRegion(region, pageable);
        } else {
            page = transactionRepository.findAll(pageable);
        }

        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    // ── Provider Config ─────────────────────────────────────────────────────────

    @GetMapping("/providers")
    public ResponseEntity<ApiResponse<List<ProviderConfig>>> getProviders() {
        return ResponseEntity.ok(ApiResponse.ok(providerConfigRepository.findAll()));
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
