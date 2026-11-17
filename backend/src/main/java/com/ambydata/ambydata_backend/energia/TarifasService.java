package com.ambydata.ambydata_backend.energia;

import com.ambydata.ambydata_backend.config.CampoInvalidoException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class TarifasService {

    // Usados se o documento não existir (a M003 cria com estes valores).
    public static final TarifasEnergia PADRAO = new TarifasEnergia(TarifasEnergia.ID, 0.85, 0.55, 150, 40, null, null);

    private final MongoTemplate mongoTemplate;

    public TarifasService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public TarifasEnergia obter() {
        TarifasEnergia tarifas = mongoTemplate.findById(TarifasEnergia.ID, TarifasEnergia.class);
        return tarifas != null ? tarifas : PADRAO;
    }

    public TarifasEnergia atualizar(TarifasRequest dados, String quem) {
        if (dados.tarifaCompensavel() > dados.tarifaCheia()) {
            throw new CampoInvalidoException("tarifaCompensavel", "A tarifa compensável não pode passar da tarifa cheia.");
        }
        return mongoTemplate.save(new TarifasEnergia(TarifasEnergia.ID, dados.tarifaCheia(), dados.tarifaCompensavel(),
                dados.demandaContratadaKw(), dados.tarifaDemanda(), Instant.now(), quem));
    }
}
