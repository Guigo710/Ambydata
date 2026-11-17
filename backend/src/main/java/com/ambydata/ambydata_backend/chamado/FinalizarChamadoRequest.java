package com.ambydata.ambydata_backend.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FinalizarChamadoRequest(@NotBlank @Size(max = 1000) String solucao) {
}
