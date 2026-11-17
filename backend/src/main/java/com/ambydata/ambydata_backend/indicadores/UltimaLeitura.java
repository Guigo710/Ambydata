package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.simulacao.OrigemLeitura;
import com.ambydata.ambydata_backend.simulacao.StatusMaquina;

import java.time.Instant;

// A leitura mais recente: o que a máquina está fazendo agora e de onde veio o dado.
public record UltimaLeitura(Instant instante, StatusMaquina status, double temperatura, OrigemLeitura origem,
        SituacaoTemperatura situacaoTemperatura) {
}
