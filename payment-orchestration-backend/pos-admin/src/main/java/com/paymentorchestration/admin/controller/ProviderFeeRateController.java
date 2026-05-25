package com.paymentorchestration.admin.controller;

import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.enums.FeeType;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.common.enums.Region;
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

    @PostMapping
    public ResponseEntity<ApiResponse<ProviderFeeRate>> create(@RequestBody FeeRateCreateRequest request) {
        if (feeRateRepository.existsByProviderAndRegionAndPaymentMethod(
                request.provider(), request.region(), request.paymentMethod())) {
            throw new PosException(
                "Fee rate already exists for " + request.provider() + "/" + request.region() + "/" + request.paymentMethod(),
                HttpStatus.CONFLICT);
        }

        ProviderFeeRate rate = new ProviderFeeRate();
        rate.setProvider(request.provider());
        rate.setRegion(request.region());
        rate.setPaymentMethod(request.paymentMethod());
        rate.setFeeType(request.feeType());
        rate.setFixedAmount(request.fixedAmount());
        rate.setPercentage(request.percentage());
        rate.setCurrency(currencyForRegion(request.region()));
        rate.setActive(request.active() != null ? request.active() : true);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(feeRateRepository.save(rate)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProviderFeeRate>> update(
            @PathVariable("id") Long id,
            @RequestBody FeeRateUpdateRequest request) {

        ProviderFeeRate rate = feeRateRepository.findById(id)
                .orElseThrow(() -> new PosException("Fee rate not found: " + id, HttpStatus.NOT_FOUND));

        if (request.fixedAmount() != null) rate.setFixedAmount(request.fixedAmount());
        if (request.percentage() != null)  rate.setPercentage(request.percentage());
        if (request.active() != null)      rate.setActive(request.active());

        return ResponseEntity.ok(ApiResponse.ok(feeRateRepository.save(rate)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable("id") Long id) {
        ProviderFeeRate rate = feeRateRepository.findById(id)
                .orElseThrow(() -> new PosException("Fee rate not found: " + id, HttpStatus.NOT_FOUND));
        rate.setActive(false);
        feeRateRepository.save(rate);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private static String currencyForRegion(Region region) {
        return switch (region) {
            case MY -> "MYR";
            case ID -> "IDR";
            case PH -> "PHP";
        };
    }

    record FeeRateCreateRequest(
        Provider provider,
        Region region,
        String paymentMethod,
        FeeType feeType,
        BigDecimal fixedAmount,
        BigDecimal percentage,
        Boolean active
    ) {}

    record FeeRateUpdateRequest(BigDecimal fixedAmount, BigDecimal percentage, Boolean active) {}
}
