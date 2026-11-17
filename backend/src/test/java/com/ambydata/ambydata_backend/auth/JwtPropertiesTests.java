package com.ambydata.ambydata_backend.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;

class JwtPropertiesTests {

    @Configuration
    @EnableConfigurationProperties(JwtProperties.class)
    static class Config {
    }

    private final ApplicationContextRunner runner = new ApplicationContextRunner().withUserConfiguration(Config.class);

    @Test
    void segredoCurtoImpedeASubida() {
        runner.withPropertyValues("app.jwt.secret=curto-demais")
                .run(contexto -> assertThat(contexto).hasFailed()
                        .getFailure().rootCause().hasMessageContaining("app.jwt.secret"));
    }

    @Test
    void segredoAusenteImpedeASubida() {
        runner.run(contexto -> assertThat(contexto).hasFailed());
    }

    @Test
    void validadePadraoEDeOitoHoras() {
        runner.withPropertyValues("app.jwt.secret=segredo-de-teste-com-mais-de-32-caracteres")
                .run(contexto -> assertThat(contexto.getBean(JwtProperties.class).expiracaoHoras()).isEqualTo(8));
    }
}
