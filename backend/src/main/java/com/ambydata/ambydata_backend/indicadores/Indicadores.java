package com.ambydata.ambydata_backend.indicadores;

// Indicadores de um intervalo. Razões entre 0 e 1 (a tela mostra em %); null quando não há
// base para o cálculo (ex.: fora do turno não há disponibilidade).
public record Indicadores(
        Double disponibilidade,
        Double performance,
        Double qualidade,
        Double oee,
        Double mtbfMinutos,
        double downtimeMinutos,
        Double pecasPorHora) {
}
