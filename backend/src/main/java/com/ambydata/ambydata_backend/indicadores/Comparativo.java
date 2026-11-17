package com.ambydata.ambydata_backend.indicadores;

import java.time.Instant;
import java.util.List;

public record Comparativo(String periodo, String por, Instant inicio, Instant fim, List<GrupoComparativo> grupos) {
}
