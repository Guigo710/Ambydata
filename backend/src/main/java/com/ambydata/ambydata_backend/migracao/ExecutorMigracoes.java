package com.ambydata.ambydata_backend.migracao;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

// Roda na subida, antes do seed, as migrações que ainda não estão registradas na
// coleção "migracao". Substitui o Mongock, que não tem versão para Spring Boot 4.
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ExecutorMigracoes implements ApplicationRunner {

    static final String COLECAO = "migracao";

    private static final Logger log = LoggerFactory.getLogger(ExecutorMigracoes.class);

    private final MongoTemplate mongoTemplate;
    private final List<Migracao> migracoes;

    public ExecutorMigracoes(MongoTemplate mongoTemplate, List<Migracao> migracoes) {
        this.mongoTemplate = mongoTemplate;
        this.migracoes = migracoes.stream().sorted(Comparator.comparing(Migracao::id)).toList();
    }

    @Override
    public void run(ApplicationArguments args) {
        var aplicadas = mongoTemplate.getCollection(COLECAO);
        for (Migracao migracao : migracoes) {
            if (aplicadas.countDocuments(new Document("_id", migracao.id())) > 0) {
                continue;
            }
            log.info("Aplicando migração {}", migracao.id());
            migracao.aplicar(mongoTemplate);
            aplicadas.insertOne(new Document("_id", migracao.id()).append("aplicadaEm", Instant.now()));
        }
    }
}
