package com.ambydata.ambydata_backend.simulacao;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.ZoneId;

@Configuration
@EnableScheduling
public class SimulacaoConfig {

    @Bean
    public GeradorLeituras geradorLeituras(SimulacaoProperties propriedades) {
        return new GeradorLeituras(ZoneId.of(propriedades.fuso()));
    }
}
