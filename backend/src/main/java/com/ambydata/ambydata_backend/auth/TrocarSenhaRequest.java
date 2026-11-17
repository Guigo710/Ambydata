package com.ambydata.ambydata_backend.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TrocarSenhaRequest(
        @NotBlank String senhaAtual,
        @NotBlank @Size(min = 8, max = 72, message = "precisa ter entre 8 e 72 caracteres") String novaSenha) {
}
