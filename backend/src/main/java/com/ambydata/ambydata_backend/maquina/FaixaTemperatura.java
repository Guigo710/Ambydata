package com.ambydata.ambydata_backend.maquina;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

// Faixa de temperatura permitida (°C). Fora dela é alerta. Os limites físicos (−100 a 1000 °C)
// também barram 1e999, que o Jackson converte em Infinity.
public record FaixaTemperatura(
        @NotNull @DecimalMin("-100") @DecimalMax("1000") Double min,
        @NotNull @DecimalMin("-100") @DecimalMax("1000") Double max) {

    public double largura() {
        return max - min;
    }

    // Crítico: fora da faixa em mais que `percentual`% da largura dela.
    // Ex.: faixa 0–10 °C e 50% → crítico abaixo de −5 °C ou acima de 15 °C.
    public FaixaTemperatura critica(int percentual) {
        double margem = largura() * percentual / 100.0;
        return new FaixaTemperatura(min - margem, max + margem);
    }
}
