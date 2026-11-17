package com.ambydata.ambydata_backend.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelarChamadoRequest(@NotBlank @Size(max = 500) String motivo) {
}
