package com.ambydata.ambydata_backend.notificacao;

import java.util.List;

// O sino: quantas não lidas e as mais recentes.
public record NotificacoesResponse(long naoLidas, List<Notificacao> itens) {
}
