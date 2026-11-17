package com.ambydata.ambydata_backend.usuario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RedefinirSenhaRequest(
        @NotBlank @Size(min = 8, max = 72, message = "precisa ter entre 8 e 72 caracteres") String novaSenha) {
}
