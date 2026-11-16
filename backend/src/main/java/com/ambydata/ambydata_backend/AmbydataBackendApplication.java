package com.ambydata.ambydata_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

// O usuário em memória padrão do Spring Security fica desligado: a autenticação é
// só pelo JWT, e ele gravaria uma senha gerada no log.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class AmbydataBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(AmbydataBackendApplication.class, args);
    }
}
