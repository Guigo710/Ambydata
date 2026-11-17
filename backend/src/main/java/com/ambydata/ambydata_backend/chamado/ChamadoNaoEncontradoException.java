package com.ambydata.ambydata_backend.chamado;

public class ChamadoNaoEncontradoException extends RuntimeException {

    public ChamadoNaoEncontradoException() {
        super("Chamado não encontrado.");
    }
}
