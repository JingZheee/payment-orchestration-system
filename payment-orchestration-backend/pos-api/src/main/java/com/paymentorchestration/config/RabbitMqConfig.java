package com.paymentorchestration.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    // Exchanges
    @Value("${rabbitmq.exchanges.webhook}") private String webhookExchange;
    @Value("${rabbitmq.exchanges.retry}")   private String retryExchange;

    // Queues
    @Value("${rabbitmq.queues.webhook}")      private String webhookQueue;
    @Value("${rabbitmq.queues.webhook-dlq}")  private String webhookDlq;
    @Value("${rabbitmq.queues.retry-30s}")    private String retry30s;
    @Value("${rabbitmq.queues.retry-60s}")    private String retry60s;
    @Value("${rabbitmq.queues.retry-120s}")   private String retry120s;
    @Value("${rabbitmq.queues.payment-dlq}")  private String paymentDlq;

    // --- Exchanges ---

    @Bean
    public DirectExchange webhookExchange() {
        return new DirectExchange(webhookExchange, true, false);
    }

    @Bean
    public DirectExchange retryExchange() {
        return new DirectExchange(retryExchange, true, false);
    }

    // --- Queues ---

    @Bean
    public Queue webhookQueue() {
        return QueueBuilder.durable(webhookQueue)
                .withArgument("x-dead-letter-exchange", webhookExchange)
                .withArgument("x-dead-letter-routing-key", webhookDlq)
                .build();
    }

    @Bean
    public Queue webhookDlq() {
        return QueueBuilder.durable(webhookDlq).build();
    }

    @Bean
    public Queue retry30sQueue() {
        return QueueBuilder.durable(retry30s)
                .withArgument("x-message-ttl", 30_000)
                .withArgument("x-dead-letter-exchange", retryExchange)
                .withArgument("x-dead-letter-routing-key", webhookQueue)
                .build();
    }

    @Bean
    public Queue retry60sQueue() {
        return QueueBuilder.durable(retry60s)
                .withArgument("x-message-ttl", 60_000)
                .withArgument("x-dead-letter-exchange", retryExchange)
                .withArgument("x-dead-letter-routing-key", webhookQueue)
                .build();
    }

    @Bean
    public Queue retry120sQueue() {
        return QueueBuilder.durable(retry120s)
                .withArgument("x-message-ttl", 120_000)
                .withArgument("x-dead-letter-exchange", retryExchange)
                .withArgument("x-dead-letter-routing-key", webhookQueue)
                .build();
    }

    @Bean
    public Queue paymentDlq() {
        return QueueBuilder.durable(paymentDlq).build();
    }

    // --- Message Converter + Template ---

    @Bean
    public MessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jackson2JsonMessageConverter());
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jackson2JsonMessageConverter());
        return factory;
    }

    // --- Bindings ---

    @Bean
    public Binding webhookQueueBinding() {
        return BindingBuilder.bind(webhookQueue()).to(webhookExchange()).with(webhookQueue);
    }

    @Bean
    public Binding webhookDlqBinding() {
        return BindingBuilder.bind(webhookDlq()).to(webhookExchange()).with(webhookDlq);
    }

    @Bean
    public Binding retry30sBinding() {
        return BindingBuilder.bind(retry30sQueue()).to(retryExchange()).with(retry30s);
    }

    @Bean
    public Binding retry60sBinding() {
        return BindingBuilder.bind(retry60sQueue()).to(retryExchange()).with(retry60s);
    }

    @Bean
    public Binding retry120sBinding() {
        return BindingBuilder.bind(retry120sQueue()).to(retryExchange()).with(retry120s);
    }

    @Bean
    public Binding paymentDlqBinding() {
        return BindingBuilder.bind(paymentDlq()).to(retryExchange()).with(paymentDlq);
    }
}
