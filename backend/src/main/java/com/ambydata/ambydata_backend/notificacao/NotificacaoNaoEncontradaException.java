package com.ambydata.ambydata_backend.notificacao;

public class NotificacaoNaoEncontradaException extends RuntimeException {

    public NotificacaoNaoEncontradaException() {
        super("Notificação não encontrada.");
    }
}
