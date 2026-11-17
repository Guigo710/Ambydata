package com.ambydata.ambydata_backend.energia;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

// O que o ENGENHEIRO informa no painel Energia. A tarifa compensável não passa da cheia
// (TarifasService).
public record TarifasRequest(
        @NotNull @DecimalMin("0.01") @DecimalMax("10") Double tarifaCheia,
        @NotNull @DecimalMin("0") @DecimalMax("10") Double tarifaCompensavel,
        @NotNull @DecimalMin("0") @DecimalMax("100000") Double demandaContratadaKw,
        @NotNull @DecimalMin("0") @DecimalMax("1000") Double tarifaDemanda) {
}
