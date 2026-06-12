package com.paymentorchestration.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReconImportResult {
    private final int rowsProcessed;
    private final int rowsMatched;
    private final int rowsUnmatched;   // merchant_order_id not found in DB
    private final int rowsSkipped;     // already reconciled
    private final int rowsNoFee;       // actual_fee column left blank
    private final int anomaliesFound;
}
