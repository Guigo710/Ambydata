package com.ambydata.ambydata_backend.auth;

// Login recusado. A mensagem é a mesma para e-mail inexistente, senha errada e
// usuário inativo, para não revelar quais e-mails estão cadastrados.
public class CredenciaisInvalidasException extends RuntimeException {

    public CredenciaisInvalidasException() {
        super("E-mail ou senha incorretos.");
    }
}
