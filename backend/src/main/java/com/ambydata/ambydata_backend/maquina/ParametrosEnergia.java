package com.ambydata.ambydata_backend.maquina;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// Energia da máquina (SPEC-indicadores, "Custo de energia"): potência ativa quando opera,
// potência devolvida à rede pela frenagem regenerativa e em quanto do tempo operando ela
// regenera (0 = não regenera). A potência regenerada não passa da ativa (MaquinaService).
public record ParametrosEnergia(
        @NotNull @DecimalMin("0.1") @DecimalMax("10000") Double potenciaKw,
        @NotNull @DecimalMin("0") @DecimalMax("10000") Double potenciaRegeneradaKw,
        @NotNull @Min(0) @Max(100) Integer percentualRegeneracao) {
}
