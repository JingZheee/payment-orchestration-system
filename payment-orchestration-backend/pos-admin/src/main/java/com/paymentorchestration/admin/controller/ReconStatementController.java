package com.paymentorchestration.admin.controller;

import com.paymentorchestration.admin.dto.ReconImportResult;
import com.paymentorchestration.admin.dto.ReconSummaryDto;
import com.paymentorchestration.admin.service.ReconImportService;
import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.enums.Provider;
import com.paymentorchestration.domain.entity.ReconStatement;
import com.paymentorchestration.domain.repository.ReconStatementRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/admin/recon")
@RequiredArgsConstructor
public class ReconStatementController {

    private final ReconStatementRepository reconRepository;
    private final ReconImportService reconImportService;

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

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<ReconSummaryDto>> getSummary() {
        long total     = reconRepository.count();
        long anomalies = reconRepository.countByAnomalyTrue();
        BigDecimal totalVariance = reconRepository.sumAbsVariance();

        ReconSummaryDto summary = ReconSummaryDto.builder()
                .totalStatements(total)
                .totalAnomalies(anomalies)
                .totalVariance(totalVariance)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ReconImportResult>> importSettlement(
            @RequestParam("file") MultipartFile file) throws IOException {

        ReconImportResult result = reconImportService.importFile(file);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        try (Workbook wb = reconImportService.generateTemplate();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            wb.write(out);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDisposition(ContentDisposition.attachment()
                    .filename("settlement_template.xlsx")
                    .build());

            return ResponseEntity.ok().headers(headers).body(out.toByteArray());
        }
    }
}
