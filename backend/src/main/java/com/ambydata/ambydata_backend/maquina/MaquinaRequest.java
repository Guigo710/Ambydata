package com.ambydata.ambydata_backend.maquina;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// Dados que o ENGENHEIRO informa ao criar ou editar uma máquina.
public record MaquinaRequest(
        @NotBlank @Size(max = 60) String nome,
        @NotNull TipoMaquina tipo,
        @NotBlank @Size(max = 40) String setor,
        @NotBlank @Size(max = 40) String linha,
        @NotNull @Min(1) @Max(10_000) Integer cadenciaIdeal,
        @NotNull @Valid FaixaTemperatura faixaTemperatura,
        @NotNull @Valid LimitesAlerta alertas,
        @NotNull @DecimalMin("0") @DecimalMax("1000000") Double custoHora,
        @NotNull @DecimalMin("0") @DecimalMax("1000000") Double valorPorPeca,
        @NotNull @Valid Turno turnoPlanejado,
        @NotNull @Valid ParametrosEnergia energia) {
}
