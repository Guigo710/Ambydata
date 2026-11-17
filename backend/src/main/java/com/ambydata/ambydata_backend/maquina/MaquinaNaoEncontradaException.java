package com.ambydata.ambydata_backend.maquina;

public class MaquinaNaoEncontradaException extends RuntimeException {

    public MaquinaNaoEncontradaException() {
        super("Máquina não encontrada.");
    }
}
