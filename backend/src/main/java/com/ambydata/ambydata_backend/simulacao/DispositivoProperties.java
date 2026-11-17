package com.ambydata.ambydata_backend.simulacao;

import org.springframework.boot.context.properties.ConfigurationProperties;

// app.dispositivo.chave (DEVICE_KEY): chave que o ESP32 envia em X-Device-Key.
// Vazia desliga a ingestão (toda leitura recebe 401).
@ConfigurationProperties("app.dispositivo")
public record DispositivoProperties(String chave) {
}
