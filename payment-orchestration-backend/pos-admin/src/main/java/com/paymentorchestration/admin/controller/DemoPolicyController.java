package com.paymentorchestration.admin.controller;

import com.paymentorchestration.admin.dto.DemoPolicyRequest;
import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.domain.entity.DemoPolicy;
import com.paymentorchestration.domain.repository.DemoPolicyRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/demo-policies")
@RequiredArgsConstructor
public class DemoPolicyController {

    private final DemoPolicyRepository demoPolicyRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DemoPolicy>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(demoPolicyRepository.findAllByOrderByCreatedAtAsc()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DemoPolicy>> create(@Valid @RequestBody DemoPolicyRequest req) {
        DemoPolicy policy = new DemoPolicy();
        policy.setHolderName(req.holderName());
        policy.setHolderEmail(req.holderEmail());
        policy.setInsuranceType(req.insuranceType());
        policy.setPolicyNumber(req.policyNumber());
        policy.setClaimReference(req.claimReference());
        policy.setAmount(req.amount());
        policy.setCurrency(req.currency());
        policy.setRegion(req.region());
        policy.setPaymentMethod(req.paymentMethod());
        policy.setPaymentType(req.paymentType());
        return ResponseEntity.ok(ApiResponse.ok(demoPolicyRepository.save(policy)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        demoPolicyRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
