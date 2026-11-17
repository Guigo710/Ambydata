package com.ambydata.ambydata_backend.indicadores;

import java.time.Instant;

// Um intervalo com os totais (os números usados nas fórmulas) e os indicadores calculados.
public record Periodo(Instant inicio, Instant fim, boolean emAndamento, Totais totais, Indicadores indicadores) {
}
