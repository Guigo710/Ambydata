package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.simulacao.StatusMaquina;

import java.time.Instant;

// Um ponto do gráfico de temperatura (e do status ao longo do tempo).
public record PontoLeitura(Instant instante, StatusMaquina status, double temperatura, int pecasProduzidas, int pecasBoas) {
}
