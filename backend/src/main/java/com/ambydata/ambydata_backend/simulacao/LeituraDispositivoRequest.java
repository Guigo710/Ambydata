package com.ambydata.ambydata_backend.simulacao;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

// Leitura enviada por um dispositivo (ESP32). Sem `instante`, vale o horário do servidor.
public record LeituraDispositivoRequest(
        @NotBlank String maquinaId,
        Instant instante,
        @NotNull StatusMaquina status,
        @NotNull Double temperatura,
        @NotNull @Min(0) @Max(10_000) Integer pecasProduzidas,
        @NotNull @Min(0) @Max(10_000) Integer pecasBoas,
        @NotNull @Min(0) @Max(10) Integer segundosParado) {
}
