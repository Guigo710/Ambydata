package com.ambydata.ambydata_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

// Usuários criados na subida (app.seed.*, vindos de ADMIN_EMAIL, ADMIN_SENHA,
// ADMIN_NOME e DEMO_SENHA). Valores vazios desligam cada parte.
@ConfigurationProperties("app.seed")
public record SeedProperties(String adminEmail, String adminSenha, String adminNome, String demoSenha) {
}
