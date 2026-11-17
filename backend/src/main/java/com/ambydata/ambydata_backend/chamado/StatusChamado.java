package com.ambydata.ambydata_backend.chamado;

// ABERTO → EM_ANDAMENTO (assumir) → FINALIZADO (finalizar); ABERTO ou EM_ANDAMENTO → CANCELADO.
public enum StatusChamado {
    ABERTO,
    EM_ANDAMENTO,
    FINALIZADO,
    CANCELADO
}
