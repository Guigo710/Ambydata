package com.ambydata.ambydata_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

// Origens do frontend autorizadas a chamar a API (app.cors.origins, vindo de CORS_ORIGINS).
@ConfigurationProperties("app.cors")
public record CorsProperties(List<String> origins) {
}
