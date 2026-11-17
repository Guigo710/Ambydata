package com.ambydata.ambydata_backend.alerta;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

// Confere os limites críticos a cada 30 s. Desligável com app.alertas.ativo=false (testes).
@Component
@ConditionalOnProperty(name = "app.alertas.ativo", havingValue = "true", matchIfMissing = true)
public class AgendadorAlertas {

    private final DetectorAlertas detector;

    public AgendadorAlertas(DetectorAlertas detector) {
        this.detector = detector;
    }

    @Scheduled(fixedDelay = 30_000, initialDelay = 30_000)
    public void verificar() {
        detector.verificar(Instant.now());
    }
}
