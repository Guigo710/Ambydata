package com.ambydata.ambydata_backend.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(@NotBlank String email, @NotBlank String senha) {
}
