package com.ambydata.ambydata_backend.auth;

import com.ambydata.ambydata_backend.usuario.UsuarioResponse;

import java.time.Instant;

public record LoginResponse(String token, Instant expiraEm, UsuarioResponse usuario) {
}
