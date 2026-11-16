package com.ambydata.ambydata_backend;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.mongodb.MongoDBContainer;

// MongoDB descartável compartilhado pelos testes de integração. Importe com
// @Import(TestcontainersConfig.class); o @ServiceConnection substitui o MONGODB_URI.
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfig {

    @Bean
    @ServiceConnection
    MongoDBContainer mongoDbContainer() {
        return new MongoDBContainer("mongo:7");
    }
}
