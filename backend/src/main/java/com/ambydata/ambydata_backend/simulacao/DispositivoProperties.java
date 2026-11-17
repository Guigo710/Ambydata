package com.ambydata.ambydata_backend.simulacao;

import org.springframework.boot.context.properties.ConfigurationProperties;

// app.dispositivo.chave (DEVICE_KEY): chave que o ESP32 envia em X-Device-Key.
// Vazia desliga a ingestão (toda leitura recebe 401). Definida, precisa de 32+ caracteres:
// uma chave curta se adivinha por tentativa e erro.
@ConfigurationProperties("app.dispositivo")
public record DispositivoProperties(String chave) {

    public static final int TAMANHO_MINIMO = 32;

    public DispositivoProperties {
        if (chave != null && !chave.isBlank() && chave.length() < TAMANHO_MINIMO) {
            throw new IllegalArgumentException(
                    "DEVICE_KEY precisa de pelo menos " + TAMANHO_MINIMO + " caracteres (use openssl rand -base64 32).");
        }
    }

    public boolean ativa() {
        return chave != null && !chave.isBlank();
    }
}
