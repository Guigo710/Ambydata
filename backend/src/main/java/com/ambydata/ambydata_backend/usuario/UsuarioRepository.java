package com.ambydata.ambydata_backend.usuario;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UsuarioRepository extends MongoRepository<Usuario, String> {

    Optional<Usuario> findByEmail(String email);

    long countByPerfilAndAtivo(Perfil perfil, Boolean ativo);
}
