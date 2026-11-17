package com.ambydata.ambydata_backend.chamado;

import com.fasterxml.jackson.annotation.JsonIgnore;

// Quem abriu ou assumiu. `sistema` = aberto pela própria máquina (limite crítico); o id do
// usuário fica só no banco (serve para avisar quem abriu), não sai na API.
public record PessoaChamado(@JsonIgnore String usuarioId, String nome, boolean sistema) {
}
