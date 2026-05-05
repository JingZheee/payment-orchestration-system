package com.paymentorchestration.domain.entity;

import java.io.Serializable;
import java.util.Objects;

public class PaymentMethodId implements Serializable {

    private String code;
    private String region;

    public PaymentMethodId() {}

    public PaymentMethodId(String code, String region) {
        this.code = code;
        this.region = region;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PaymentMethodId other)) return false;
        return Objects.equals(code, other.code) && Objects.equals(region, other.region);
    }

    @Override
    public int hashCode() {
        return Objects.hash(code, region);
    }
}
