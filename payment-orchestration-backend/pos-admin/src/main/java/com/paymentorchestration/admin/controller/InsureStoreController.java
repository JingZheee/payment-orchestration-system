package com.paymentorchestration.admin.controller;

import com.paymentorchestration.admin.dto.DemoCheckoutResponse;
import com.paymentorchestration.admin.dto.StorePayRequest;
import com.paymentorchestration.admin.dto.StoreProductResponse;
import com.paymentorchestration.admin.dto.StoreQuoteRequest;
import com.paymentorchestration.admin.dto.StoreQuoteResponse;
import com.paymentorchestration.admin.dto.StoreResultResponse;
import com.paymentorchestration.admin.service.EmailNotificationService;
import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.enums.Currency;
import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.common.enums.Region;
import com.paymentorchestration.domain.entity.DemoPolicy;
import com.paymentorchestration.domain.entity.Transaction;
import com.paymentorchestration.domain.repository.DemoPolicyRepository;
import com.paymentorchestration.domain.repository.StoreProductRepository;
import com.paymentorchestration.domain.repository.TransactionRepository;
import com.paymentorchestration.payment.dto.InitiatePaymentRequest;
import com.paymentorchestration.payment.dto.InitiatePaymentResponse;
import com.paymentorchestration.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/store")
@RequiredArgsConstructor
public class InsureStoreController {

    private final StoreProductRepository storeProductRepository;
    private final DemoPolicyRepository demoPolicyRepository;
    private final TransactionRepository transactionRepository;
    private final PaymentService paymentService;
    private final EmailNotificationService emailNotificationService;

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<StoreProductResponse>>> getProducts(
            @RequestParam(defaultValue = "MY") String region) {
        List<StoreProductResponse> products = storeProductRepository
                .findByActiveTrueAndRegionOrderBySortOrderAsc(region.toUpperCase())
                .stream()
                .map(StoreProductResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(products));
    }

    /**
     * Step 1 of 2: Save customer application as a quote (no payment initiated).
     * Sends an email to the customer with a one-click payment link.
     * This decouples form submission from payment initiation, eliminating
     * back-button duplicate payment issues.
     */
    @PostMapping("/quote")
    public ResponseEntity<ApiResponse<StoreQuoteResponse>> createQuote(
            @Valid @RequestBody StoreQuoteRequest req) {

        Region region     = Region.valueOf(req.region().toUpperCase());
        Currency currency = Currency.valueOf(req.currency().toUpperCase());
        String regionCode = region.name();

        DemoPolicy policy = new DemoPolicy();
        policy.setHolderName(req.holderName());
        policy.setHolderEmail(req.holderEmail());
        policy.setInsuranceType(req.insuranceType());
        policy.setPolicyNumber("POL-" + regionCode + "-" + String.valueOf(System.currentTimeMillis()).substring(7));
        policy.setAmount(req.amount());
        policy.setCurrency(currency.name());
        policy.setRegion(regionCode);
        policy.setPaymentType("PREMIUM_COLLECTION");
        policy.setStatus("QUOTE");
        DemoPolicy saved = demoPolicyRepository.save(policy);

        String paymentLink = req.appBaseUrl() + "/store/complete?policyId=" + saved.getId();
        emailNotificationService.sendQuoteEmail(saved, paymentLink);

        return ResponseEntity.ok(ApiResponse.ok(
                new StoreQuoteResponse(saved.getId(), saved.getPolicyNumber(),
                        "Quote saved. Check your email to complete payment.")
        ));
    }

    /**
     * Step 2 of 2: Initiate payment for an existing quote.
     * Called from the complete-payment page when the customer clicks "Pay Now".
     * The routing engine selects the provider based on the stored region.
     */
    @PostMapping("/pay")
    public ResponseEntity<ApiResponse<DemoCheckoutResponse>> pay(
            @Valid @RequestBody StorePayRequest req) {

        DemoPolicy policy = demoPolicyRepository.findById(req.policyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Quote not found: " + req.policyId()));

        // PENDING: idempotent re-send — return the existing provider checkout URL
        if ("PENDING".equals(policy.getStatus()) && policy.getTransactionId() != null) {
            Transaction existing = transactionRepository.findById(policy.getTransactionId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Transaction not found for policy: " + req.policyId()));
            if (existing.getRedirectUrl() != null || existing.getVaNumber() != null) {
                return ResponseEntity.ok(ApiResponse.ok(
                        new DemoCheckoutResponse(policy.getId(), existing.getId(),
                                existing.getRedirectUrl(), existing.getVaNumber())
                ));
            }
        }

        // ACTIVATED/DISBURSED: already paid — block
        if ("ACTIVATED".equals(policy.getStatus()) || "DISBURSED".equals(policy.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This policy has already been paid.");
        }

        // Allow QUOTE (first attempt) or FAILED/RETRY_EXHAUSTED (retry after failure)
        if (!("QUOTE".equals(policy.getStatus())
                || "FAILED".equals(policy.getStatus())
                || "RETRY_EXHAUSTED".equals(policy.getStatus()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Unexpected policy state: " + policy.getStatus());
        }

        // Persist the payment method chosen at pay-time (overrides any prior value)
        policy.setPaymentMethod(req.paymentMethod());
        demoPolicyRepository.save(policy);

        Region   region   = Region.valueOf(policy.getRegion());
        Currency currency = Currency.valueOf(policy.getCurrency());

        // Append a suffix on retries to avoid provider order_id conflicts
        boolean isRetry = !"QUOTE".equals(policy.getStatus());
        String merchantOrderId = "INS-" + policy.getId().toString().substring(0, 8).toUpperCase()
                + (isRetry ? "-R" + (System.currentTimeMillis() % 10000) : "");

        InitiatePaymentRequest paymentReq = InitiatePaymentRequest.builder()
                .policyId(policy.getId())
                .merchantOrderId(merchantOrderId)
                .amount(policy.getAmount())
                .currency(currency)
                .region(region)
                .paymentMethod(policy.getPaymentMethod())
                .paymentType(PaymentType.PREMIUM_COLLECTION)
                .customerEmail(policy.getHolderEmail())
                .description(policy.getInsuranceType() + " premium payment")
                .redirectUrl(appendPolicyId(req.redirectUrl(), policy.getId()))
                .policyNumber(policy.getPolicyNumber())
                .build();

        InitiatePaymentResponse payRes = paymentService.initiatePayment(
                paymentReq, UUID.randomUUID().toString());

        // PaymentService handles all policy status/transactionId transitions

        return ResponseEntity.ok(ApiResponse.ok(
                new DemoCheckoutResponse(policy.getId(), payRes.getTransactionId(),
                        payRes.getRedirectUrl(), payRes.getVaNumber())
        ));
    }

    /**
     * Looks up routing + policy details by policyId (UUID).
     * Works for all states: QUOTE (no transaction yet), PENDING, ACTIVATED.
     */
    @GetMapping("/result")
    public ResponseEntity<ApiResponse<StoreResultResponse>> getResult(
            @RequestParam UUID policyId) {

        DemoPolicy policy = demoPolicyRepository.findById(policyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No policy found: " + policyId));

        if (policy.getTransactionId() == null) {
            return ResponseEntity.ok(ApiResponse.ok(StoreResultResponse.fromQuote(policy)));
        }

        Transaction t = transactionRepository.findById(policy.getTransactionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No transaction found for policy: " + policyId));

        return ResponseEntity.ok(ApiResponse.ok(StoreResultResponse.from(t, policy)));
    }

    private static String appendPolicyId(String baseUrl, UUID policyId) {
        if (baseUrl == null) return null;
        return baseUrl.contains("?")
                ? baseUrl + "&policyId=" + policyId
                : baseUrl + "?policyId=" + policyId;
    }
}
