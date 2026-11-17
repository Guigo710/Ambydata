package com.ambydata.ambydata_backend.simulacao;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.migracao.M002MaquinasIniciais;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfig.class)
class SimuladorTests {

    // Um instante dentro do turno (13:00 em São Paulo), alinhado a 10 s.
    private static final Instant AGORA = Instant.parse("2026-11-10T16:00:00Z");

    @Autowired
    private SimuladorLeituras simulador;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private M002MaquinasIniciais m002;

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        m002.aplicar(mongoTemplate);
        mongoTemplate.remove(new Query(), Leitura.class);
    }

    @Test
    void cadaMaquinaAtivaGanhaUmaLeituraPorTick() {
        desativar("Rotuladora 06");

        simulador.registrar(AGORA);
        simulador.registrar(AGORA.plusSeconds(3)); // mesmo bloco de 10 s: não duplica

        assertThat(mongoTemplate.count(new Query(), Leitura.class)).isEqualTo(5);
        assertThat(mongoTemplate.count(Query.query(Criteria.where("maquinaId").is(idDe("Rotuladora 06"))), Leitura.class)).isZero();
    }

    @Test
    void preencheALacunaDaUltimaHoraSemDuplicar() {
        simulador.registrar(AGORA.minus(Duration.ofMinutes(20))); // havia leitura antes de "dormir"

        simulador.preencherLacunas(AGORA);
        simulador.preencherLacunas(AGORA); // de novo: idempotente

        long blocosNaHora = Duration.ofMinutes(60).toSeconds() / 10 + 1;
        assertThat(mongoTemplate.count(new Query(), Leitura.class)).isEqualTo(6 * blocosNaHora);
    }

    @Test
    void preenchimentoNaoQuebraSeOTickGravarNoMeioDoCaminho() {
        // Corrida real: entre conferir o que existe e inserir, o job (ou a instância antiga num
        // deploy) grava o mesmo bloco. O preenchimento precisa seguir, e a subida não pode cair.
        Leitura doTick = mongoTemplate.findAll(Leitura.class).stream().findFirst().orElse(null);
        assertThat(doTick).isNull();
        Instant t = AGORA.minus(Duration.ofMinutes(10));
        java.util.List<Leitura> lote = new ArrayList<>();
        for (Maquina m : mongoTemplate.findAll(Maquina.class)) {
            lote.add(new GeradorLeituras(java.time.ZoneId.of("America/Sao_Paulo")).gerar(m, t));
        }
        mongoTemplate.insert(lote.get(0));

        simulador.inserirIgnorandoRepetidas(lote);

        assertThat(mongoTemplate.count(new Query(), Leitura.class)).isEqualTo(lote.size());
    }

    @Test
    void leituraPreenchidaEIgualAQueSeriaGravadaNaHora() {
        Instant antes = AGORA.minus(Duration.ofMinutes(30));
        simulador.preencherLacunas(AGORA);
        Leitura preenchida = mongoTemplate.findById(Leitura.idDe(idDe("Forno 02"), antes), Leitura.class);

        mongoTemplate.remove(new Query(), Leitura.class);
        simulador.registrar(antes);
        Leitura naHora = mongoTemplate.findById(Leitura.idDe(idDe("Forno 02"), antes), Leitura.class);

        assertThat(preenchida).isEqualTo(naHora);
    }

    @Test
    void maquinaComDispositivoAtivoNaoESimulada() {
        String forno = idDe("Forno 02");
        mongoTemplate.insert(new Leitura("dispositivo-1", forno, AGORA.minusSeconds(60), StatusMaquina.OPERANDO,
                185.0, 5, 5, 0, OrigemLeitura.DISPOSITIVO));

        simulador.registrar(AGORA);

        assertThat(mongoTemplate.count(Query.query(Criteria.where("maquinaId").is(forno)
                .and("origem").is(OrigemLeitura.SIMULADOR)), Leitura.class)).isZero();
    }

    @Test
    void leiturasExpiramEm48Horas() {
        var indices = mongoTemplate.getCollection("leitura").listIndexes().into(new ArrayList<Document>());
        assertThat(indices).anyMatch(i -> i.get("key", Document.class).containsKey("instante")
                && i.get("expireAfterSeconds") instanceof Number segundos
                && segundos.longValue() == 48 * 3600);
    }

    private String idDe(String nome) {
        return mongoTemplate.findOne(Query.query(Criteria.where("nome").is(nome)), Maquina.class).getId();
    }

    private void desativar(String nome) {
        Maquina m = mongoTemplate.findOne(Query.query(Criteria.where("nome").is(nome)), Maquina.class);
        m.setAtiva(false);
        mongoTemplate.save(m);
    }
}
