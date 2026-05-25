package com.paymentorchestration.provider.xendit;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "providers.xendit")
@Getter
@Setter
public class XenditProperties {

    private String secretKey;
    private String webhookToken;
    private String baseUrl = "https://api.xendit.co";
}
