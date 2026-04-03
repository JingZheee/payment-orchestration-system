package com.paymentorchestration.provider.mock;

import com.paymentorchestration.common.enums.MockProviderMode;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "providers.mock")
@Getter
@Setter
public class MockProviderProperties {

    private MockProviderMode defaultMode = MockProviderMode.ALWAYS_SUCCESS;
    private double randomSuccessRate = 0.8;
    private long delayMs = 3000;
}
