package com.ambydata.ambydata_backend.chamado;

// Muitos chamados abertos pela mesma pessoa em pouco tempo (429): evita que uma conta (ou um
// token roubado) encha o kanban e esconda os chamados críticos.
public class MuitosChamadosException extends RuntimeException {

    public MuitosChamadosException() {
        super("Você abriu muitos chamados em pouco tempo. Aguarde alguns minutos.");
    }
}
