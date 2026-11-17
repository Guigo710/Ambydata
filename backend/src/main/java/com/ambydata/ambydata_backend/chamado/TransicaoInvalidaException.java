package com.ambydata.ambydata_backend.chamado;

// A ação não vale para o status atual (ex.: finalizar um chamado que ninguém assumiu, ou outro
// engenheiro assumiu primeiro): 409.
public class TransicaoInvalidaException extends RuntimeException {

    public TransicaoInvalidaException(String mensagem) {
        super(mensagem);
    }
}
