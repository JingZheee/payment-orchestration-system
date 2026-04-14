package com.paymentorchestration.provider.mock;

import com.paymentorchestration.common.enums.MockProviderMode;
import com.paymentorchestration.common.enums.PaymentMethod;
import com.paymentorchestration.common.enums.PaymentStatus;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.domain.repository.ProviderFeeRateRepository;
import com.paymentorchestration.provider.dto.*;
import com.paymentorchestration.provider.port.PaymentProviderPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mock provider for testing and demos. Supports 4 configurable modes:
 * ALWAYS_SUCCESS, ALWAYS_FAIL, RANDOM, DELAYED.
 *
 * State is held in-memory — resets on app restart.
 * Mode is toggled via admin dashboard or application-dev.yml.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MockProviderAdapter implements PaymentProviderPort {

    private final MockProviderProperties properties;
    private final ProviderFeeRateRepository providerFeeRateRepository;

    /** In-memory store of mock transaction states for status polling. */
    private final Map<String, PaymentStatus> transactionStore = new ConcurrentHashMap<>();

    private final Random random = new Random();

    /** Runtime mode override — null means use properties.defaultMode */
    private volatile MockProviderMode modeOverride = null;

    @Override
    public Provider getProvider() {
        return Provider.MOCK;
    }

    @Override
    public PaymentResult initiatePayment(PaymentRequest request) {
        MockProviderMode mode = activeMode();
        log.info("Mock provider initiating payment {} in mode {}", request.getTransactionId(), mode);

        PaymentStatus resultStatus = resolveStatus(mode);
        String providerTxnId = "MOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        transactionStore.put(providerTxnId, resultStatus);

        return PaymentResult.builder()
                .providerTransactionId(providerTxnId)
                .status(resultStatus)
                .redirectUrl("http://localhost:8080/mock/pay/" + providerTxnId)
                .fee(calculateFee(request.getAmount(), request.getPaymentMethod()))
                .rawResponse("{\"mock\":true,\"mode\":\"" + mode + "\",\"status\":\"" + resultStatus + "\"}")
                .build();
    }

    @Override
    public PaymentStatusResult queryPaymentStatus(String providerTransactionId) {
        PaymentStatus status = transactionStore.getOrDefault(providerTransactionId, PaymentStatus.PROCESSING);

        // DELAYED mode: first poll still shows PROCESSING, subsequent polls succeed
        if (activeMode() == MockProviderMode.DELAYED) {
            status = transactionStore.compute(providerTransactionId, (k, current) ->
                    current == PaymentStatus.PROCESSING ? PaymentStatus.SUCCESS : current);
        }

        return PaymentStatusResult.builder()
                .providerTransactionId(providerTransactionId)
                .status(status)
                .rawResponse("{\"mock\":true,\"status\":\"" + status + "\"}")
                .build();
    }

    @Override
    public RefundResult initiateRefund(RefundRequest request) {
        return RefundResult.builder()
                .providerRefundId("MOCK-REFUND-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status(PaymentStatus.REFUNDED)
                .amount(request.getAmount())
                .rawResponse("{\"mock\":true,\"refunded\":true}")
                .build();
    }

    @Override
    public boolean verifyWebhookSignature(byte[] rawBody, Map<String, String> headers) {
        return true; // Mock always passes verification
    }

    @Override
    public WebhookParseResult parseWebhookPayload(String rawBody) {
        // Mock webhooks carry providerTransactionId and status as plain fields
        // Real format: {"providerTransactionId":"MOCK-XXXX","status":"SUCCESS"}
        String providerTxnId = extractField(rawBody, "providerTransactionId");
        String statusStr = extractField(rawBody, "status");

        PaymentStatus status;
        try {
            status = PaymentStatus.valueOf(statusStr);
        } catch (IllegalArgumentException e) {
            status = PaymentStatus.PROCESSING;
        }

        return WebhookParseResult.builder()
                .provider(Provider.MOCK)
                .providerTransactionId(providerTxnId)
                .status(status)
                .rawPayload(rawBody)
                .build();
    }

    @Override
    public List<PaymentMethod> supportedMethods() {
        return Arrays.asList(PaymentMethod.values()); // mock supports all methods
    }

    @Override
    public BigDecimal calculateFee(BigDecimal amount, PaymentMethod paymentMethod) {
        if (paymentMethod == null) paymentMethod = PaymentMethod.FPX;
        return providerFeeRateRepository
                .findByProviderAndPaymentMethodAndActiveTrue(Provider.MOCK, paymentMethod)
                .map(rate -> rate.compute(amount))
                .orElseGet(() -> amount.multiply(BigDecimal.valueOf(0.01)).setScale(4, RoundingMode.HALF_UP));
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    /** Switch mode at runtime (called by admin API). */
    public void setMode(MockProviderMode mode) {
        log.info("Mock provider mode changed to {}", mode);
        this.modeOverride = mode;
    }

    public MockProviderMode getActiveMode() {
        return activeMode();
    }

    // --- private helpers ---

    private MockProviderMode activeMode() {
        return modeOverride != null ? modeOverride : properties.getDefaultMode();
    }

    private PaymentStatus resolveStatus(MockProviderMode mode) {
        return switch (mode) {
            case ALWAYS_SUCCESS -> PaymentStatus.SUCCESS;
            case ALWAYS_FAIL -> PaymentStatus.FAILED;
            case RANDOM -> random.nextDouble() < properties.getRandomSuccessRate()
                    ? PaymentStatus.SUCCESS
                    : PaymentStatus.FAILED;
            case DELAYED -> {
                try {
                    Thread.sleep(properties.getDelayMs());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                yield PaymentStatus.PROCESSING; // will resolve on next status poll
            }
        };
    }

    private String extractField(String json, String field) {
        String key = "\"" + field + "\":\"";
        int start = json.indexOf(key);
        if (start == -1) return "";
        start += key.length();
        int end = json.indexOf("\"", start);
        return end == -1 ? "" : json.substring(start, end);
    }
}
