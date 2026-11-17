package com.ambydata.ambydata_backend.maquina;

import jakarta.validation.constraints.NotNull;

// Faixa de temperatura permitida (°C). Fora dela é alerta.
public record FaixaTemperatura(@NotNull Double min, @NotNull Double max) {

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
