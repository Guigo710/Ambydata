package com.ambydata.ambydata_backend.migracao;

import com.ambydata.ambydata_backend.energia.TarifasEnergia;
import com.ambydata.ambydata_backend.energia.TarifasService;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.ParametrosEnergia;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.util.Map;

// Custo de energia (SPEC-indicadores): potência e regeneração das 6 máquinas iniciais e as
// tarifas da fábrica. Só preenche o que ainda não existe; não mexe no que o ENGENHEIRO ajustou.
@Component
public class M003Energia implements Migracao {

    // Regeneram as máquinas com motor de frenagem (misturadora, envasadora, rotuladora).
    private static final Map<String, ParametrosEnergia> POR_MAQUINA = Map.of(
            "Misturadora 01", new ParametrosEnergia(15.0, 4.0, 10),
            "Forno 02", new ParametrosEnergia(45.0, 0.0, 0),
            "Resfriador 03", new ParametrosEnergia(30.0, 0.0, 0),
            "Envasadora 04", new ParametrosEnergia(11.0, 3.0, 15),
            "Seladora 05", new ParametrosEnergia(8.0, 0.0, 0),
            "Rotuladora 06", new ParametrosEnergia(5.5, 1.5, 10));

    @Override
    public String id() {
        return "003-energia";
    }

    @Override
    public void aplicar(MongoTemplate mongoTemplate) {
        POR_MAQUINA.forEach((nome, energia) -> mongoTemplate.updateFirst(
                Query.query(Criteria.where("nome").is(nome).and("energia").exists(false)),
                new Update().set("energia", energia), Maquina.class));
        if (!mongoTemplate.exists(Query.query(Criteria.where("_id").is(TarifasEnergia.ID)), TarifasEnergia.class)) {
            mongoTemplate.insert(TarifasService.PADRAO);
        }
    }
}
