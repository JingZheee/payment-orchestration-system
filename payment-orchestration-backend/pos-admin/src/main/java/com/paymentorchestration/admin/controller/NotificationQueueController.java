package com.paymentorchestration.admin.controller;

import com.paymentorchestration.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.listener.MessageListenerContainer;
import org.springframework.amqp.rabbit.listener.RabbitListenerEndpointRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/notification-queue")
@RequiredArgsConstructor
@Slf4j
public class NotificationQueueController {

    private final RabbitListenerEndpointRegistry rabbitListenerEndpointRegistry;
    private final RabbitAdmin rabbitAdmin;

    @Value("${rabbitmq.queues.notification}")
    private String notificationQueue;

    @PostMapping("/consumer/start")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startConsumer() {
        MessageListenerContainer container = rabbitListenerEndpointRegistry
                .getListenerContainer("notificationConsumer");
        if (container != null && !container.isRunning()) {
            container.start();
            log.info("[notification-queue] consumer started");
        }
        return ResponseEntity.ok(ApiResponse.ok(buildStatus()));
    }

    @PostMapping("/consumer/stop")
    public ResponseEntity<ApiResponse<Map<String, Object>>> stopConsumer() {
        MessageListenerContainer container = rabbitListenerEndpointRegistry
                .getListenerContainer("notificationConsumer");
        if (container != null && container.isRunning()) {
            container.stop();
            log.info("[notification-queue] consumer stopped");
        }
        return ResponseEntity.ok(ApiResponse.ok(buildStatus()));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus() {
        return ResponseEntity.ok(ApiResponse.ok(buildStatus()));
    }

    private Map<String, Object> buildStatus() {
        MessageListenerContainer container = rabbitListenerEndpointRegistry
                .getListenerContainer("notificationConsumer");
        boolean active = container != null && container.isRunning();

        var info = rabbitAdmin.getQueueInfo(notificationQueue);
        long depth = (info != null) ? info.getMessageCount() : 0L;

        return Map.of("consumerActive", active, "queueDepth", depth);
    }
}
