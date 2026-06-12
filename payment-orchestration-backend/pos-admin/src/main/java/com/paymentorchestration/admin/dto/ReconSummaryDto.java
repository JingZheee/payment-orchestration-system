package com.paymentorchestration.admin.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class ReconSummaryDto {
    private final long totalStatements;
    private final long totalAnomalies;
    private final BigDecimal totalVariance;
}
