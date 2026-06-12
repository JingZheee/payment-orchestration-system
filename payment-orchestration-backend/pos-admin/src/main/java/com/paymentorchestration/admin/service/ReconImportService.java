package com.paymentorchestration.admin.service;

import com.paymentorchestration.admin.dto.ReconImportResult;
import com.paymentorchestration.domain.entity.ReconStatement;
import com.paymentorchestration.domain.entity.Transaction;
import com.paymentorchestration.domain.repository.ReconStatementRepository;
import com.paymentorchestration.domain.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReconImportService {

    private final TransactionRepository transactionRepository;
    private final ReconStatementRepository reconRepository;

    @Value("${recon.anomaly-threshold-pct:5.0}")
    private double anomalyThresholdPct;

    // Template column indices
    private static final int COL_MERCHANT_ORDER_ID = 0;
    private static final int COL_PROVIDER          = 1;
    private static final int COL_PAYMENT_METHOD    = 2;
    private static final int COL_AMOUNT            = 3;
    private static final int COL_EXPECTED_FEE      = 4;
    private static final int COL_SETTLEMENT_DATE   = 5;
    private static final int COL_ACTUAL_FEE        = 6;

    @Transactional
    public ReconImportResult importFile(MultipartFile file) throws IOException {
        int rowsProcessed   = 0;
        int rowsMatched     = 0;
        int rowsUnmatched   = 0;  // merchant_order_id not found in transactions table
        int rowsSkipped     = 0;  // already reconciled
        int rowsNoFee       = 0;  // actual_fee column left blank
        int anomaliesFound  = 0;

        List<ReconStatement> toSave = new ArrayList<>();

        try (Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            // Skip header row
            if (rows.hasNext()) rows.next();

            while (rows.hasNext()) {
                Row row = rows.next();
                rowsProcessed++;

                String merchantOrderId = stringCell(row, COL_MERCHANT_ORDER_ID);
                if (merchantOrderId == null || merchantOrderId.isBlank()) continue;

                BigDecimal actualFee = decimalCell(row, COL_ACTUAL_FEE);
                if (actualFee == null) {
                    rowsNoFee++;
                    log.debug("[recon-import] row {} has blank actual_fee, merchant_order_id={}", row.getRowNum(), merchantOrderId);
                    continue;
                }

                Transaction txn = transactionRepository.findByMerchantOrderId(merchantOrderId)
                        .orElse(null);
                if (txn == null) {
                    log.warn("[recon-import] no transaction found for merchant_order_id={}", merchantOrderId);
                    rowsUnmatched++;
                    continue;
                }

                if (reconRepository.existsByTransactionId(txn.getId())) {
                    log.debug("[recon-import] already reconciled transaction_id={}", txn.getId());
                    rowsSkipped++;
                    continue;
                }

                rowsMatched++;

                BigDecimal expectedFee = txn.getFee() != null ? txn.getFee() : BigDecimal.ZERO;
                BigDecimal variance    = actualFee.subtract(expectedFee);
                BigDecimal variancePct = expectedFee.compareTo(BigDecimal.ZERO) != 0
                        ? variance.divide(expectedFee, 6, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;

                boolean anomaly = variancePct.abs()
                        .multiply(BigDecimal.valueOf(100))
                        .compareTo(BigDecimal.valueOf(anomalyThresholdPct)) > 0;

                if (anomaly) anomaliesFound++;

                LocalDate settlementDate = dateCell(row, COL_SETTLEMENT_DATE);

                ReconStatement stmt = new ReconStatement();
                stmt.setTransactionId(txn.getId());
                stmt.setProvider(txn.getProvider());
                stmt.setRegion(txn.getRegion());
                stmt.setPaymentMethod(txn.getPaymentMethod());
                stmt.setTransactionAmount(txn.getAmount());
                stmt.setExpectedFee(expectedFee);
                stmt.setActualFee(actualFee);
                stmt.setVariance(variance);
                stmt.setVariancePct(variancePct);
                stmt.setAnomaly(anomaly);
                stmt.setStatementDate(settlementDate);

                toSave.add(stmt);
            }
        }

        reconRepository.saveAll(toSave);

        log.info("[recon-import] processed={} matched={} noFee={} unmatched={} skipped={} anomalies={}",
                rowsProcessed, rowsMatched, rowsNoFee, rowsUnmatched, rowsSkipped, anomaliesFound);

        return ReconImportResult.builder()
                .rowsProcessed(rowsProcessed)
                .rowsMatched(rowsMatched)
                .rowsUnmatched(rowsUnmatched)
                .rowsSkipped(rowsSkipped)
                .rowsNoFee(rowsNoFee)
                .anomaliesFound(anomaliesFound)
                .build();
    }

    /**
     * Generates a pre-filled template workbook from transactions that haven't been reconciled yet.
     * The actual_fee column is intentionally left blank for the admin to fill in.
     */
    public Workbook generateTemplate() {
        List<Transaction> unreconciled = reconRepository
                .findUnreconciledTransactions(PageRequest.of(0, 50));

        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("Settlement");

        // Header row
        Row header = sheet.createRow(0);
        String[] cols = {
            "merchant_order_id", "provider", "payment_method",
            "amount", "expected_fee", "settlement_date", "actual_fee"
        };
        CellStyle headerStyle = wb.createCellStyle();
        Font headerFont = wb.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        for (int i = 0; i < cols.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(cols[i]);
            cell.setCellStyle(headerStyle);
            sheet.setColumnWidth(i, 5000);
        }

        // Data rows — pre-filled except actual_fee
        int rowNum = 1;
        for (Transaction txn : unreconciled) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(COL_MERCHANT_ORDER_ID).setCellValue(txn.getMerchantOrderId());
            row.createCell(COL_PROVIDER).setCellValue(txn.getProvider().name());
            row.createCell(COL_PAYMENT_METHOD).setCellValue(
                    txn.getPaymentMethod() != null ? txn.getPaymentMethod() : "");
            row.createCell(COL_AMOUNT).setCellValue(
                    txn.getAmount().doubleValue());
            row.createCell(COL_EXPECTED_FEE).setCellValue(
                    txn.getFee() != null ? txn.getFee().doubleValue() : 0.0);
            row.createCell(COL_SETTLEMENT_DATE).setCellValue(
                    txn.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate().toString());
            // COL_ACTUAL_FEE left blank intentionally
        }

        // Widen merchant_order_id column
        sheet.setColumnWidth(COL_MERCHANT_ORDER_ID, 10000);

        return wb;
    }

    // --- cell helpers ---

    private String stringCell(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default      -> null;
        };
    }

    private BigDecimal decimalCell(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue());
            case STRING  -> {
                try { yield new BigDecimal(cell.getStringCellValue().trim()); }
                catch (NumberFormatException e) { yield null; }
            }
            default -> null;
        };
    }

    private LocalDate dateCell(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        try {
            return switch (cell.getCellType()) {
                case NUMERIC -> {
                    Date d = cell.getDateCellValue();
                    yield d != null ? d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate() : null;
                }
                case STRING -> {
                    String s = cell.getStringCellValue().trim();
                    yield s.isBlank() ? null : LocalDate.parse(s);
                }
                default -> null;
            };
        } catch (Exception e) {
            return null;
        }
    }
}
