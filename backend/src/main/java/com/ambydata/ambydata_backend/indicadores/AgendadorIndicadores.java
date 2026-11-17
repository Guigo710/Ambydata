package com.ambydata.ambydata_backend.indicadores;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

// Quando os agregados são gravados: na subida (os 7 dias que faltarem) e a cada hora fechada.
// Desligável com app.indicadores.agendado=false (usado nos testes, que chamam o agregador direto).
@Component
@Order(20) // depois das migrações e do simulador
@ConditionalOnProperty(name = "app.indicadores.agendado", havingValue = "true", matchIfMissing = true)
public class AgendadorIndicadores implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AgendadorIndicadores.class);

    private final AgregadorHoras agregador;

    public AgendadorIndicadores(AgregadorHoras agregador) {
        this.agregador = agregador;
    }

    // Uma falha aqui só vai para o log: os indicadores não podem impedir a API de subir.
    @Override
    public void run(ApplicationArguments args) {
        try {
            long inicio = System.currentTimeMillis();
            int criados = agregador.preencher(Instant.now());
            log.info("Indicadores: {} horas agregadas em {} ms", criados, System.currentTimeMillis() - inicio);
        } catch (RuntimeException e) {
            log.error("Indicadores: falha ao preencher os agregados por hora", e);
        }
    }

    // 5 s depois da virada da hora, para a última leitura da hora já estar gravada.
    @Scheduled(cron = "5 0 * * * *")
    public void horaFechada() {
        agregador.agregarHoraFechada(Instant.now());
    }
}
