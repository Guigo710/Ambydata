package com.ambydata.ambydata_backend.usuario;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "usuario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    private String id;

    private String nome;

    // Único: impede contas duplicadas. A migração 001 também garante o índice.
    @Indexed(unique = true)
    private String email;

    private String senhaHash;

    private Perfil perfil;

    private Boolean ativo = true;
}
