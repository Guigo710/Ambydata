package com.ambydata.ambydata_backend.config;

// Regra de negócio violada num campo específico (ex.: nome duplicado, faixa invertida).
// Sai como 400 com o campo em `campos`, igual a um erro de validação.
public class CampoInvalidoException extends RuntimeException {

    private final String campo;

    public CampoInvalidoException(String campo, String mensagem) {
        super(mensagem);
        this.campo = campo;
    }

    public String getCampo() {
        return campo;
    }
}
