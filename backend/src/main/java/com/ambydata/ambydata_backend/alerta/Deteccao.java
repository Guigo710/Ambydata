package com.ambydata.ambydata_backend.alerta;

// Um limite crítico ultrapassado agora: a causa e o texto com o valor medido e o limite.
public record Deteccao(CausaAlerta causa, String descricao, String resumo) {
}
