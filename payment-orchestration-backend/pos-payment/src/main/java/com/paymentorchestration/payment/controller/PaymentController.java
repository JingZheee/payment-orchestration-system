package com.paymentorchestration.payment.controller;

import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.domain.entity.Transaction;
import com.paymentorchestration.domain.entity.TransactionEvent;
import com.paymentorchestration.domain.repository.TransactionEventRepository;
import com.paymentorchestration.payment.dto.InitiatePaymentRequest;
import com.paymentorchestration.payment.dto.InitiatePaymentResponse;
import com.paymentorchestration.payment.filter.IdempotencyFilter;
import com.paymentorchestration.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final TransactionEventRepository eventRepository;

    /**
     * Initiate a new payment.
     *
     * Requires header: {@code Idempotency-Key: <uuid>}
     * The IdempotencyFilter enforces deduplication before this method is called.
     */
    @PostMapping("/initiate")
    public ResponseEntity<ApiResponse<InitiatePaymentResponse>> initiate(
            @Valid @RequestBody InitiatePaymentRequest request,
            @RequestHeader(IdempotencyFilter.IDEMPOTENCY_HEADER) String idempotencyKey) {

        InitiatePaymentResponse response = paymentService.initiatePayment(request, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Payment initiated"));
    }

    /**
     * Initiate a claims disbursement (insurer → claimant / hospital).
     * Identical to /initiate but forces paymentType = CLAIMS_DISBURSEMENT so the routing engine
     * applies the reliability-first (SUCCESS_RATE) rule automatically.
     */
    @PostMapping("/disburse")
    public ResponseEntity<ApiResponse<InitiatePaymentResponse>> disburse(
            @Valid @RequestBody InitiatePaymentRequest request,
            @RequestHeader(IdempotencyFilter.IDEMPOTENCY_HEADER) String idempotencyKey) {

        InitiatePaymentRequest disbursement = InitiatePaymentRequest.builder()
                .merchantOrderId(request.getMerchantOrderId())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .region(request.getRegion())
                .paymentMethod(request.getPaymentMethod())
                .customerEmail(request.getCustomerEmail())
                .description(request.getDescription())
                .redirectUrl(request.getRedirectUrl())
                .paymentType(PaymentType.CLAIMS_DISBURSEMENT)
                .policyNumber(request.getPolicyNumber())
                .claimReference(request.getClaimReference())
                .build();

        InitiatePaymentResponse response = paymentService.initiatePayment(disbursement, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Disbursement initiated"));
    }

    /**
     * Get a transaction by ID, including its full event log.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TransactionDetail>> getTransaction(
            @PathVariable("id") UUID id) {

        Transaction transaction = paymentService.getTransaction(id);
        List<TransactionEvent> events =
                eventRepository.findByTransactionIdOrderByCreatedAtAsc(id);

        return ResponseEntity.ok(ApiResponse.ok(new TransactionDetail(transaction, events)));
    }

    /** Projection combining a transaction and its event log. */
    public record TransactionDetail(Transaction transaction, List<TransactionEvent> events) {}
}
