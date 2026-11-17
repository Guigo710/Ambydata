package com.ambydata.ambydata_backend.chamado;

import java.time.Instant;

// Uma linha do histórico do chamado.
public record EventoChamado(Instant em, TipoEvento tipo, String texto, String por) {
}
