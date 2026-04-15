package com.paymentorchestration.admin.controller;

import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.exception.PosException;
import com.paymentorchestration.domain.entity.ProviderFeeRate;
import com.paymentorchestration.domain.repository.ProviderFeeRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/fee-rates")
@RequiredArgsConstructor
public class ProviderFeeRateController {

    private final ProviderFeeRateRepository feeRateRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProviderFeeRate>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(feeRateRepository.findAllByOrderByProviderAscRegionAscPaymentMethodAsc()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProviderFeeRate>> update(
            @PathVariable("id") Long id,
            @RequestBody FeeRateUpdateRequest request) {

        ProviderFeeRate rate = feeRateRepository.findById(id)
                .orElseThrow(() -> new PosException("Fee rate not found: " + id, HttpStatus.NOT_FOUND));

        if (request.fixedAmount() != null) rate.setFixedAmount(request.fixedAmount());
        if (request.percentage() != null)  rate.setPercentage(request.percentage());

        return ResponseEntity.ok(ApiResponse.ok(feeRateRepository.save(rate)));
    }

    record FeeRateUpdateRequest(BigDecimal fixedAmount, BigDecimal percentage) {}
}
