package com.paymentorchestration.admin.controller;

import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.domain.entity.ReconStatement;
import com.paymentorchestration.domain.repository.ReconStatementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/recon")
@RequiredArgsConstructor
public class ReconStatementController {

    private final ReconStatementRepository reconRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ReconStatement>>> getAll(
            @RequestParam(required = false) Provider provider,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<ReconStatement> page = provider != null
                ? reconRepository.findByProviderOrderByCreatedAtDesc(provider, pageable)
                : reconRepository.findAllByOrderByCreatedAtDesc(pageable);

        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @GetMapping("/anomalies")
    public ResponseEntity<ApiResponse<Page<ReconStatement>>> getAnomalies(
            @RequestParam(required = false) Provider provider,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<ReconStatement> page = provider != null
                ? reconRepository.findByProviderAndAnomalyTrueOrderByCreatedAtDesc(provider, pageable)
                : reconRepository.findByAnomalyTrueOrderByCreatedAtDesc(pageable);

        return ResponseEntity.ok(ApiResponse.ok(page));
    }
}
