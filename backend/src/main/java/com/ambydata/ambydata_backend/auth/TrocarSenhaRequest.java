package com.ambydata.ambydata_backend.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TrocarSenhaRequest(
        @NotBlank String senhaAtual,
        @NotBlank @Size(min = 8, message = "precisa de pelo menos 8 caracteres") String novaSenha) {
}
