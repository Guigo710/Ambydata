package com.ambydata.ambydata_backend.migracao;

import com.ambydata.ambydata_backend.maquina.CenarioSimulacao;
import com.ambydata.ambydata_backend.maquina.FaixaTemperatura;
import com.ambydata.ambydata_backend.maquina.LimitesAlerta;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.TipoMaquina;
import com.ambydata.ambydata_backend.maquina.Turno;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Collation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.util.List;

// Fábrica alimentícia fictícia: 2 linhas, 6 máquinas, cada uma com um cenário do simulador
// (ver SPEC-fabrica.md e SPEC-simulacao.md). Só insere quem ainda não existe pelo nome.
@Component
public class M002MaquinasIniciais implements Migracao {

    private static final LimitesAlerta ALERTAS_PADRAO = new LimitesAlerta(50, 15, 8.0);
    private static final Turno TURNO_PADRAO = new Turno("06:00", "22:00");

    @Override
    public String id() {
        return "002-maquinas-iniciais";
    }

    @Override
    public void aplicar(MongoTemplate mongoTemplate) {
        // Nome único sem diferenciar maiúsculas nem acentos ("Forno 02" = "FORNO 02"). É o banco que
        // garante: a checagem do serviço sozinha deixaria passar dois cadastros simultâneos.
        mongoTemplate.indexOps(Maquina.class).createIndex(new Index("nome", Sort.Direction.ASC)
                .named("nome").unique().collation(Collation.of("pt").strength(Collation.ComparisonLevel.primary())));
        for (Maquina maquina : maquinas()) {
            boolean existe = mongoTemplate.exists(Query.query(Criteria.where("nome").is(maquina.getNome())), Maquina.class);
            if (!existe) {
                mongoTemplate.insert(maquina);
            }
        }
    }

    private static List<Maquina> maquinas() {
        return List.of(
                maquina("Misturadora 01", TipoMaquina.MISTURADORA, "Preparo", "Linha A", 40, 20, 35, 90, 1.80, CenarioSimulacao.SAUDAVEL),
                maquina("Forno 02", TipoMaquina.FORNO, "Cozimento", "Linha A", 30, 160, 200, 150, 2.20, CenarioSimulacao.AQUECIMENTO),
                maquina("Resfriador 03", TipoMaquina.RESFRIADOR, "Resfriamento", "Linha A", 30, 2, 8, 80, 1.50, CenarioSimulacao.OSCILACAO),
                maquina("Envasadora 04", TipoMaquina.ENVASADORA, "Envase", "Linha B", 60, 18, 30, 120, 2.50, CenarioSimulacao.PARADAS_FREQUENTES),
                maquina("Seladora 05", TipoMaquina.SELADORA, "Embalagem", "Linha B", 60, 140, 170, 100, 2.00, CenarioSimulacao.DEFEITOS_ALTOS),
                maquina("Rotuladora 06", TipoMaquina.ROTULADORA, "Embalagem", "Linha B", 70, 18, 32, 70, 1.20, CenarioSimulacao.SAUDAVEL));
    }

    private static Maquina maquina(String nome, TipoMaquina tipo, String setor, String linha, int cadencia,
            double tempMin, double tempMax, double custoHora, double valorPorPeca, CenarioSimulacao cenario) {
        return new Maquina(null, nome, tipo, setor, linha, cadencia, new FaixaTemperatura(tempMin, tempMax),
                ALERTAS_PADRAO, custoHora, valorPorPeca, TURNO_PADRAO, true, cenario);
    }
}
