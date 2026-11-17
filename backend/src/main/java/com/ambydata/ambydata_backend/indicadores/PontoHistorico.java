package com.ambydata.ambydata_backend.indicadores;

import java.time.Instant;

// Uma hora fechada do histórico. `semDados` = hora sem agregado (lacuna): totais e
// indicadores ficam nulos, e o gráfico mostra o buraco em vez de inventar zero.
public record PontoHistorico(Instant hora, boolean semDados, FonteAgregado fonte, Totais totais,
        Indicadores indicadores, Double temperaturaMedia, Double temperaturaMinima, Double temperaturaMaxima) {
}
