package com.paymentorchestration.provider.billplz;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "providers.billplz")
@Getter
@Setter
public class BillplzProperties {

    private String apiKey;
    private String collectionId;
    private String webhookSecret;
    private String baseUrl = "https://www.billplz-sandbox.com/api/v3";
}
