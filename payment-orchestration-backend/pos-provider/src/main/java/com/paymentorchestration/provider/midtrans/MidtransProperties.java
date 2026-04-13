package com.paymentorchestration.provider.midtrans;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "providers.midtrans")
@Getter
@Setter
public class MidtransProperties {

    private String serverKey;
    private String clientKey;
    private String webhookSecret;
    private String baseUrl = "https://api.sandbox.midtrans.com/v2";
}
