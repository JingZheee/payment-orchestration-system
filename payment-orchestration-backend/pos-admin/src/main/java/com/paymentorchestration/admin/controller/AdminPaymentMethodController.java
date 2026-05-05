package com.paymentorchestration.admin.controller;

import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.exception.PosException;
import com.paymentorchestration.domain.entity.PaymentMethodEntity;
import com.paymentorchestration.domain.entity.PaymentMethodId;
import com.paymentorchestration.domain.repository.PaymentMethodRepository;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/payment-methods")
@RequiredArgsConstructor
public class AdminPaymentMethodController {

    private final PaymentMethodRepository paymentMethodRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PaymentMethodEntity>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(
                paymentMethodRepository.findAllByOrderByRegionAscCodeAsc()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PaymentMethodEntity>> create(
            @RequestBody CreateRequest request) {

        if (paymentMethodRepository.existsByCodeAndRegion(request.code(), request.region())) {
            throw new PosException(
                    "Payment method " + request.code() + " already exists for region " + request.region(),
                    HttpStatus.CONFLICT);
        }

        PaymentMethodEntity entity = new PaymentMethodEntity();
        entity.setCode(request.code().toUpperCase());
        entity.setRegion(request.region().toUpperCase());
        entity.setName(request.name());
        entity.setActive(true);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(paymentMethodRepository.save(entity)));
    }

    @PutMapping("/{region}/{code}")
    public ResponseEntity<ApiResponse<PaymentMethodEntity>> update(
            @PathVariable String region,
            @PathVariable String code,
            @RequestBody UpdateRequest request) {

        PaymentMethodEntity entity = paymentMethodRepository
                .findById(new PaymentMethodId(code.toUpperCase(), region.toUpperCase()))
                .orElseThrow(() -> new PosException(
                        "Payment method " + code + " not found for region " + region,
                        HttpStatus.NOT_FOUND));

        if (request.name() != null)   entity.setName(request.name());
        if (request.active() != null) entity.setActive(request.active());

        return ResponseEntity.ok(ApiResponse.ok(paymentMethodRepository.save(entity)));
    }

    @DeleteMapping("/{region}/{code}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable String region,
            @PathVariable String code) {

        PaymentMethodId id = new PaymentMethodId(code.toUpperCase(), region.toUpperCase());
        paymentMethodRepository.findById(id)
                .orElseThrow(() -> new PosException(
                        "Payment method " + code + " not found for region " + region,
                        HttpStatus.NOT_FOUND));

        try {
            paymentMethodRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.ok(null));
        } catch (DataIntegrityViolationException e) {
            throw new PosException(
                    "Cannot delete " + code + "/" + region + " — referenced by existing transactions or fee rates",
                    HttpStatus.CONFLICT);
        }
    }

    record CreateRequest(@NotBlank String code, @NotBlank String region, @NotBlank String name) {}
    record UpdateRequest(String name, Boolean active) {}
}
