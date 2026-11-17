package com.ambydata.ambydata_backend.usuario;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AtualizarUsuarioRequest(
        @NotBlank String nome,
        @NotBlank @Email String email,
        @NotNull Perfil perfil) {
}
