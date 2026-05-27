package com.paymentorchestration.domain.repository;

import com.paymentorchestration.domain.entity.StoreProduct;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StoreProductRepository extends JpaRepository<StoreProduct, UUID> {
    List<StoreProduct> findByActiveTrueAndRegionOrderBySortOrderAsc(String region);
}
