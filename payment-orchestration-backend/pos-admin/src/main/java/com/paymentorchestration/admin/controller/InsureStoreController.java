package com.paymentorchestration.admin.controller;

import com.paymentorchestration.admin.dto.DemoCheckoutRequest;
import com.paymentorchestration.admin.dto.DemoCheckoutResponse;
import com.paymentorchestration.admin.dto.StoreProductResponse;
import com.paymentorchestration.admin.dto.StoreResultResponse;
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
     * Customer-facing checkout: creates a demo policy and initiates a Billplz payment.
     * Returns the Billplz bill URL so the frontend can redirect the customer.
     */
    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<DemoCheckoutResponse>> checkout(
            @Valid @RequestBody DemoCheckoutRequest req) {

        Region region   = Region.valueOf(req.region().toUpperCase());
        Currency currency = Currency.valueOf(req.currency().toUpperCase());
        String regionCode = region.name();

        // Create policy record
        DemoPolicy policy = new DemoPolicy();
        policy.setHolderName(req.holderName());
        policy.setHolderEmail(req.holderEmail());
        policy.setInsuranceType(req.insuranceType());
        policy.setPolicyNumber("POL-" + regionCode + "-" + String.valueOf(System.currentTimeMillis()).substring(7));
        policy.setAmount(req.amount());
        policy.setCurrency(currency.name());
        policy.setRegion(regionCode);
        policy.setPaymentMethod(req.paymentMethod());
        policy.setPaymentType("PREMIUM_COLLECTION");
        DemoPolicy saved = demoPolicyRepository.save(policy);

        // Initiate payment — provider is selected by routing engine based on region
        InitiatePaymentRequest paymentReq = InitiatePaymentRequest.builder()
                .policyId(saved.getId())
                .merchantOrderId("INS-" + saved.getId().toString().substring(0, 8).toUpperCase())
                .amount(req.amount())
                .currency(currency)
                .region(region)
                .paymentMethod(req.paymentMethod())
                .paymentType(PaymentType.PREMIUM_COLLECTION)
                .customerEmail(req.holderEmail())
                .description(req.insuranceType() + " premium payment")
                .redirectUrl(req.redirectUrl())
                .policyNumber(saved.getPolicyNumber())
                .build();

        InitiatePaymentResponse payRes = paymentService.initiatePayment(
                paymentReq, UUID.randomUUID().toString());

        return ResponseEntity.ok(ApiResponse.ok(
                new DemoCheckoutResponse(saved.getId(), payRes.getTransactionId(), payRes.getRedirectUrl())
        ));
    }

    /**
     * Looks up routing + policy details by Billplz bill ID (providerTransactionId).
     * Called from the payment-result page after Billplz redirects the customer back.
     */
    @GetMapping("/result")
    public ResponseEntity<ApiResponse<StoreResultResponse>> getResult(
            @RequestParam String billId) {

        Transaction t = transactionRepository.findByProviderTransactionId(billId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No transaction found for bill: " + billId));

        DemoPolicy policy = demoPolicyRepository.findByTransactionId(t.getId()).orElse(null);

        return ResponseEntity.ok(ApiResponse.ok(StoreResultResponse.from(t, policy)));
    }
}
