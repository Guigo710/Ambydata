package com.ambydata.ambydata_backend.usuario;

// Dados públicos de um usuário. Nunca inclui o hash da senha.
public record UsuarioResponse(String id, String nome, String email, Perfil perfil, boolean ativo) {

    public static UsuarioResponse de(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getNome(), u.getEmail(), u.getPerfil(),
                Boolean.TRUE.equals(u.getAtivo()));
    }
}
