package com.ambydata.ambydata_backend.usuario;

// Operação que deixaria o sistema sem um ADMIN ativo, ou um ADMIN se desativando.
public class RegraDeAdminException extends RuntimeException {

    public RegraDeAdminException(String mensagem) {
        super(mensagem);
    }
}
