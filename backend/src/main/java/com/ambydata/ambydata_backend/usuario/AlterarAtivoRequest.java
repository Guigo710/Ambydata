package com.ambydata.ambydata_backend.usuario;

import jakarta.validation.constraints.NotNull;

public record AlterarAtivoRequest(@NotNull Boolean ativo) {
}
