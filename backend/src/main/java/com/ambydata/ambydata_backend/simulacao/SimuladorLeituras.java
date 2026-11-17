package com.ambydata.ambydata_backend.simulacao;

import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.BulkOperationException;
import org.springframework.data.mongodb.core.BulkOperations;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// Grava a cada 10 s a leitura simulada de cada máquina ativa e, na subida, preenche o
// intervalo em que o backend esteve parado (o Render free dorme sem uso). Máquinas que
// receberam leitura de um dispositivo nos últimos 5 min não são simuladas.
@Component
@Order(10) // depois das migrações
public class SimuladorLeituras implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SimuladorLeituras.class);
    private static final Duration DISPOSITIVO_RECENTE = Duration.ofMinutes(5);
    private static final int CHAVE_REPETIDA = 11000;

    private final GeradorLeituras gerador;
    private final MaquinaService maquinas;
    private final MongoTemplate mongoTemplate;
    private final SimulacaoProperties propriedades;

    public SimuladorLeituras(GeradorLeituras gerador, MaquinaService maquinas, MongoTemplate mongoTemplate,
            SimulacaoProperties propriedades) {
        this.gerador = gerador;
        this.maquinas = maquinas;
        this.mongoTemplate = mongoTemplate;
        this.propriedades = propriedades;
    }

    // Um erro aqui não pode impedir a API de subir: o simulador é acessório.
    @Override
    public void run(ApplicationArguments args) {
        if (propriedades.ativo()) {
            try {
                preencherLacunas(Instant.now());
            } catch (RuntimeException e) {
                log.error("Simulador: falha ao preencher lacunas; segue só com o job de 10 s", e);
            }
        }
    }

    // Cron alinhado ao relógio (:00, :10, :20...): um bloco por disparo, sem deriva que pule bloco.
    @Scheduled(cron = "*/10 * * * * *")
    public void tick() {
        if (propriedades.ativo()) {
            registrar(Instant.now());
        }
    }

    public void registrar(Instant agora) {
        for (Maquina maquina : simuladas(agora)) {
            try {
                mongoTemplate.save(gerador.gerar(maquina, agora)); // id por bloco: regravar é idempotente
            } catch (RuntimeException e) {
                log.warn("Simulador: leitura de {} não gravada: {}", maquina.getNome(), e.getMessage());
            }
        }
    }

    public void preencherLacunas(Instant agora) {
        Instant inicio = agora.minus(Duration.ofMinutes(propriedades.preenchimentoMinutos()));
        int criadas = 0;
        for (Maquina maquina : simuladas(agora)) {
            List<Leitura> doIntervalo = new ArrayList<>();
            for (Instant t = inicio; !t.isAfter(agora); t = t.plusSeconds(GeradorLeituras.SEGUNDOS_POR_BLOCO)) {
                doIntervalo.add(gerador.gerar(maquina, t));
            }
            Set<String> existentes = idsExistentes(doIntervalo.stream().map(Leitura::getId).toList());
            List<Leitura> faltando = doIntervalo.stream().filter(l -> !existentes.contains(l.getId())).toList();
            criadas += inserirIgnorandoRepetidas(faltando);
        }
        log.info("Simulador: {} leituras preenchidas desde {}", criadas, inicio);
    }

    // Insere sem ordem e ignora só as repetidas (código 11000): se o job gravou um bloco entre a
    // conferência e a inserção, o resto do lote entra mesmo assim.
    int inserirIgnorandoRepetidas(List<Leitura> leituras) {
        if (leituras.isEmpty()) {
            return 0;
        }
        try {
            return mongoTemplate.bulkOps(BulkOperations.BulkMode.UNORDERED, Leitura.class)
                    .insert(leituras).execute().getInsertedCount();
        } catch (BulkOperationException e) {
            boolean soRepetidas = e.getErrors().stream().allMatch(erro -> erro.getCode() == CHAVE_REPETIDA);
            if (!soRepetidas) {
                throw e;
            }
            return e.getResult().getInsertedCount();
        }
    }

    private List<Maquina> simuladas(Instant agora) {
        Set<String> comDispositivo = new HashSet<>(mongoTemplate.findDistinct(
                Query.query(Criteria.where("origem").is(OrigemLeitura.DISPOSITIVO)
                        .and("instante").gte(agora.minus(DISPOSITIVO_RECENTE))),
                "maquinaId", Leitura.class, String.class));
        return maquinas.listar(true).stream().filter(m -> !comDispositivo.contains(m.getId())).toList();
    }

    private Set<String> idsExistentes(List<String> ids) {
        Query query = Query.query(Criteria.where("_id").in(ids));
        query.fields().include("_id");
        Set<String> existentes = new HashSet<>();
        mongoTemplate.find(query, Leitura.class).forEach(l -> existentes.add(l.getId()));
        return existentes;
    }
}
