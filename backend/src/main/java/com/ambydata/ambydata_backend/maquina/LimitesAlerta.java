package com.ambydata.ambydata_backend.maquina;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// Limites que transformam um alerta em crítico (abre chamado automático). Configurados
// pelo ENGENHEIRO em cada máquina.
public record LimitesAlerta(
        @NotNull @Min(1) @Max(500) Integer percentualCritico,
        @NotNull @Min(1) @Max(480) Integer minutosParadoMax,
        @NotNull @DecimalMin("0.1") @DecimalMax("100") Double taxaDefeitosMax) {
}
