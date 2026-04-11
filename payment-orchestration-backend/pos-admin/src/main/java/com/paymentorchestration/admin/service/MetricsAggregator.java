package com.paymentorchestration.admin.service;

import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.domain.entity.ProviderMetrics;
import com.paymentorchestration.domain.entity.Transaction;
import com.paymentorchestration.domain.repository.ProviderMetricsRepository;
import com.paymentorchestration.domain.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class MetricsAggregator {

    private final TransactionRepository transactionRepository;
    private final ProviderMetricsRepository providerMetricsRepository;

    @Value("${routing.metrics.window-minutes:60}")
    private long windowMinutes;

    @Scheduled(fixedRate = 15, timeUnit = TimeUnit.MINUTES)
    public void aggregate() {
        Instant windowEnd = Instant.now();
        Instant windowStart = windowEnd.minus(windowMinutes, ChronoUnit.MINUTES);

        log.info("[metrics] Aggregating provider metrics for window {} → {}", windowStart, windowEnd);

        List<Transaction> txns = transactionRepository.findAll().stream()
                .filter(t -> t.getCreatedAt() != null && t.getCreatedAt().isAfter(windowStart))
                .toList();

        if (txns.isEmpty()) {
            log.info("[metrics] No transactions in window — skipping");
            return;
        }

        Map<String, List<Transaction>> grouped = txns.stream()
                .collect(Collectors.groupingBy(t -> t.getProvider().name() + ":" + t.getRegion().name()));

        for (Map.Entry<String, List<Transaction>> entry : grouped.entrySet()) {
            String[] parts = entry.getKey().split(":");
            Provider provider = Provider.valueOf(parts[0]);
            Region region = Region.valueOf(parts[1]);
            List<Transaction> group = entry.getValue();

            int total = group.size();
            long successCount = group.stream()
                    .filter(t -> t.getStatus() == PaymentStatus.SUCCESS)
                    .count();

            BigDecimal successRate = total > 0
                    ? BigDecimal.valueOf(successCount)
                            .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            long avgLatencyMs = (long) group.stream()
                    .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getUpdatedAt()).toMillis())
                    .filter(ms -> ms >= 0)
                    .average()
                    .orElse(0);

            ProviderMetrics metrics = new ProviderMetrics();
            metrics.setProvider(provider);
            metrics.setRegion(region);
            metrics.setSuccessRate(successRate);
            metrics.setAvgLatencyMs(avgLatencyMs);
            metrics.setTransactionCount(total);
            metrics.setWindowStart(windowStart);
            metrics.setWindowEnd(windowEnd);

            providerMetricsRepository.save(metrics);
            log.info("[metrics] {}/{} — successRate={}, latency={}ms, count={}",
                    provider, region, successRate, avgLatencyMs, total);
        }
    }
}
