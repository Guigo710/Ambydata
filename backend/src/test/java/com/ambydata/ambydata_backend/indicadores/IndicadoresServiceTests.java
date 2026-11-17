package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import com.ambydata.ambydata_backend.migracao.M002MaquinasIniciais;
import com.ambydata.ambydata_backend.simulacao.GeradorLeituras;
import com.ambydata.ambydata_backend.simulacao.Leitura;
import com.ambydata.ambydata_backend.simulacao.SimulacaoProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// O "agora" de uma máquina somando agregados das horas fechadas e leituras da hora corrente
// tem de dar o mesmo que as leituras do período inteiro (o gerador é a referência).
@SpringBootTest
@Import(TestcontainersConfig.class)
class IndicadoresServiceTests {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private static final Instant AGORA = Instant.parse("2026-11-10T16:20:00Z");      // 13:20 em SP
    private static final Instant INICIO_TURNO = Instant.parse("2026-11-10T09:00:00Z"); // 06:00 em SP

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private MaquinaService maquinas;

    @Autowired
    private M002MaquinasIniciais m002;

    private final GeradorLeituras gerador = new GeradorLeituras(FUSO);
    private final SimulacaoProperties simulacao = new SimulacaoProperties(true, "America/Sao_Paulo", 60);
    private AgregadorHoras agregador;
    private IndicadoresService servico;
    private Maquina envasadora;

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        m002.aplicar(mongoTemplate);
        mongoTemplate.remove(new Query(), Leitura.class);
        mongoTemplate.remove(new Query(), IndicadorHora.class);
        agregador = new AgregadorHoras(mongoTemplate, maquinas, gerador, simulacao);
        servico = new IndicadoresService(mongoTemplate, maquinas, simulacao);
        envasadora = mongoTemplate.findOne(Query.query(Criteria.where("nome").is("Envasadora 04")), Maquina.class);
    }

    @Test
    void turnoEmAndamentoSomaHorasFechadasELeiturasDaHoraCorrente() {
        agregador.preencher(AGORA);
        gravar(envasadora, AGORA.minusSeconds(3600 - 10), AGORA); // última hora de leituras brutas

        AgoraMaquina agora = servico.agora(envasadora.getId(), AGORA);

        assertThat(agora.turno().inicio()).isEqualTo(INICIO_TURNO);
        assertThat(agora.turno().fim()).isEqualTo(AGORA);
        assertThat(agora.turno().totais()).isEqualTo(Totais.de(geradas(envasadora, INICIO_TURNO, AGORA)));
        assertThat(agora.ultimaHora().totais()).isEqualTo(Totais.de(geradas(envasadora, AGORA.minusSeconds(3600 - 10), AGORA)));
        assertThat(agora.ultimaHora().indicadores().oee()).isNotNull();
        assertThat(agora.ultimaLeitura().instante()).isEqualTo(AGORA);
        assertThat(agora.frequenciaSegundos()).isEqualTo(10);
    }

    @Test
    void horaFechadaSemAgregadoUsaAsLeiturasGravadas() {
        agregador.preencher(AGORA);
        gravar(envasadora, AGORA.minusSeconds(3600 - 10), AGORA);
        Instant meioDia = Instant.parse("2026-11-10T12:00:00Z");
        mongoTemplate.remove(Query.query(Criteria.where("_id").is(IndicadorHora.idDe(envasadora.getId(), meioDia))), IndicadorHora.class);
        gravar(envasadora, meioDia, meioDia.plusSeconds(3590));

        AgoraMaquina agora = servico.agora(envasadora.getId(), AGORA);

        assertThat(agora.turno().totais()).isEqualTo(Totais.de(geradas(envasadora, INICIO_TURNO, AGORA)));
    }

    @Test
    void foraDoTurnoMostraOTurnoQueTerminou() {
        Instant depois = Instant.parse("2026-11-11T02:00:00Z"); // 23:00 em SP
        agregador.preencher(depois);

        AgoraMaquina agora = servico.agora(envasadora.getId(), depois);

        Instant fim = Instant.parse("2026-11-11T01:00:00Z"); // 22:00 em SP
        assertThat(agora.turno().emAndamento()).isFalse();
        assertThat(agora.turno().fim()).isEqualTo(fim);
        assertThat(agora.turno().totais()).isEqualTo(Totais.de(geradas(envasadora, INICIO_TURNO, fim.minusSeconds(10))));
        assertThat(agora.ultimaLeitura()).isNull(); // nenhuma leitura bruta gravada
    }

    private void gravar(Maquina m, Instant de, Instant ate) {
        mongoTemplate.insertAll(geradas(m, de, ate));
    }

    // Leituras do gerador de `de` até `ate`, inclusive.
    private List<Leitura> geradas(Maquina m, Instant de, Instant ate) {
        List<Leitura> leituras = new ArrayList<>();
        for (Instant t = de; !t.isAfter(ate); t = t.plusSeconds(10)) {
            leituras.add(gerador.gerar(m, t));
        }
        return leituras;
    }
}
