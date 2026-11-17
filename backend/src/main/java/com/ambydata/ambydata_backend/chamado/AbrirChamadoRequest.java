package com.ambydata.ambydata_backend.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AbrirChamadoRequest(
        @NotNull TipoChamado tipo,
        @NotBlank @Size(max = 64) String maquinaId,
        @NotBlank @Size(max = 1000) String descricao,
        @NotNull Prioridade prioridade) {
}
