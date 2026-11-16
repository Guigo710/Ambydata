package com.ambydata.ambydata_backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// Contrato da API em /v3/api-docs e /swagger-ui. O esquema "bearer" faz o botão
// "Authorize" do Swagger enviar o token do login em todas as chamadas.
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI ambydataOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("AmbyData API")
                        .version("v1")
                        .description("Monitoramento industrial. Faça login em POST /api/auth/login e "
                                + "cole o token em \"Authorize\" para chamar as demais rotas."))
                .components(new Components().addSecuritySchemes("bearer", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
