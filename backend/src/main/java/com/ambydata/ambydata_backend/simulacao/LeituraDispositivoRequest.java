package com.ambydata.ambydata_backend.simulacao;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

// Leitura enviada por um dispositivo (ESP32). Sem `instante`, vale o horário do servidor; com ele,
// só é aceito perto de agora (ver IngestaoController.JANELA_PASSADO/JANELA_FUTURO).
public record LeituraDispositivoRequest(
        @NotBlank @Size(max = 64) String maquinaId,
        Instant instante,
        @NotNull StatusMaquina status,
        @NotNull @DecimalMin("-100") @DecimalMax("1000") Double temperatura,
        @NotNull @Min(0) @Max(10_000) Integer pecasProduzidas,
        @NotNull @Min(0) @Max(10_000) Integer pecasBoas,
        @NotNull @Min(0) @Max(10) Integer segundosParado) {
}
