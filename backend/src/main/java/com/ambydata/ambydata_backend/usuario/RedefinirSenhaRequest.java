package com.ambydata.ambydata_backend.usuario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RedefinirSenhaRequest(
        @NotBlank @Size(min = 8, message = "precisa de pelo menos 8 caracteres") String novaSenha) {
}
