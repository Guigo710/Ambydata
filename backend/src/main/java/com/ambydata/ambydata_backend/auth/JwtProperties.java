package com.ambydata.ambydata_backend.auth;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

// Configuração do token (app.jwt.*). Validada na subida: com segredo ausente ou
// menor que 32 caracteres (256 bits, mínimo do HS256) a aplicação não sobe.
@Validated
@ConfigurationProperties("app.jwt")
public record JwtProperties(
        @NotNull @Size(min = 32, message = "precisa de pelo menos 32 caracteres") String secret,
        @DefaultValue("8") @Min(1) int expiracaoHoras) {
}
