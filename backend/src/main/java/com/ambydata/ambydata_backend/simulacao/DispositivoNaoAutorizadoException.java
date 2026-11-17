package com.ambydata.ambydata_backend.simulacao;

public class DispositivoNaoAutorizadoException extends RuntimeException {

    public DispositivoNaoAutorizadoException() {
        super("Chave de dispositivo inválida.");
    }
}
