package com.ambydata.ambydata_backend.simulacao;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

// app.simulacao.*: liga/desliga o simulador (SIMULADOR_ATIVO), fuso do turno das máquinas
// e quantos minutos para trás preencher quando o backend volta a subir.
@ConfigurationProperties("app.simulacao")
public record SimulacaoProperties(
        @DefaultValue("true") boolean ativo,
        @DefaultValue("America/Sao_Paulo") String fuso,
        @DefaultValue("60") int preenchimentoMinutos) {
}
