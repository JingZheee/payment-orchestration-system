package com.paymentorchestration.provider.paymongo;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "providers.paymongo")
@Getter
@Setter
public class PayMongoProperties {

    private String secretKey;
    private String webhookSecret;
    private String baseUrl = "https://api.paymongo.com/v1";
}
