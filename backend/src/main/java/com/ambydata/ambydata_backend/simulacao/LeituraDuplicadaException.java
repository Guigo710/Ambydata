package com.ambydata.ambydata_backend.simulacao;

public class LeituraDuplicadaException extends RuntimeException {

    public LeituraDuplicadaException() {
        super("Já existe uma leitura desta máquina neste intervalo de 10 segundos.");
    }
}
