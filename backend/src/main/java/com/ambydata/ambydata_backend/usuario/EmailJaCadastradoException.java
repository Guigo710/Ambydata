package com.ambydata.ambydata_backend.usuario;

public class EmailJaCadastradoException extends RuntimeException {

    public EmailJaCadastradoException() {
        super("E-mail já cadastrado.");
    }
}
