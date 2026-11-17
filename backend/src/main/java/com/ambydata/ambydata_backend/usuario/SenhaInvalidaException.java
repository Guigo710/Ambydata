package com.ambydata.ambydata_backend.usuario;

// Senha recusada por uma regra do domínio (senha atual errada, tamanho em bytes).
public class SenhaInvalidaException extends RuntimeException {

    public SenhaInvalidaException(String mensagem) {
        super(mensagem);
    }
}
