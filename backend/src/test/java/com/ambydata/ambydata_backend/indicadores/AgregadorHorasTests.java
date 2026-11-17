package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import com.ambydata.ambydata_backend.migracao.M002MaquinasIniciais;
import com.ambydata.ambydata_backend.simulacao.GeradorLeituras;
import com.ambydata.ambydata_backend.simulacao.Leitura;
import com.ambydata.ambydata_backend.simulacao.OrigemLeitura;
import com.ambydata.ambydata_backend.simulacao.SimulacaoProperties;
import com.ambydata.ambydata_backend.simulacao.StatusMaquina;
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
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfig.class)
class AgregadorHorasTests {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    // 13:20 em São Paulo: a hora fechada anterior é 12:00–13:00 (15:00–16:00 UTC), dentro do turno.
    private static final Instant AGORA = Instant.parse("2026-11-10T16:20:00Z");
    private static final Instant HORA = Instant.parse("2026-11-10T15:00:00Z");

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private MaquinaService maquinas;

    @Autowired
    private M002MaquinasIniciais m002;

    private final GeradorLeituras gerador = new GeradorLeituras(FUSO);
    private AgregadorHoras agregador;
    private Maquina forno;

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        m002.aplicar(mongoTemplate);
        mongoTemplate.remove(new Query(), Leitura.class);
        mongoTemplate.remove(new Query(), IndicadorHora.class);
        agregador = new AgregadorHoras(mongoTemplate, maquinas, gerador, new SimulacaoProperties(true, "America/Sao_Paulo", 60));
        forno = mongoTemplate.findOne(Query.query(Criteria.where("nome").is("Forno 02")), Maquina.class);
    }

    @Test
    void horaSemDispositivoERecalculadaPeloGerador() {
        IndicadorHora hora = agregador.agregar(forno, HORA);

        List<Leitura> geradas = new ArrayList<>();
        for (Instant t = HORA; t.isBefore(HORA.plus(Duration.ofHours(1))); t = t.plusSeconds(10)) {
            geradas.add(gerador.gerar(forno, t));
        }
        assertThat(hora.getFonte()).isEqualTo(FonteAgregado.GERADOR);
        assertThat(hora.totais()).isEqualTo(Totais.de(geradas));
        assertThat(hora.totais().segundosPlanejados()).isEqualTo(3600);
        assertThat(hora.getLeituras()).isEqualTo(360);
        assertThat(hora.getTemperaturaMaxima()).isEqualTo(geradas.stream().mapToDouble(Leitura::getTemperatura).max().orElseThrow());
        assertThat(hora.getId()).isEqualTo(forno.getId() + ":" + HORA.getEpochSecond() / 3600);
    }

    @Test
    void horaComDispositivoUsaSoAsLeiturasGravadas() {
        mongoTemplate.insert(leituraDispositivo(HORA.plusSeconds(60), StatusMaquina.OPERANDO, 5, 4));
        mongoTemplate.insert(leituraDispositivo(HORA.plusSeconds(70), StatusMaquina.PARADA, 0, 0));

        IndicadorHora hora = agregador.agregar(forno, HORA);

        assertThat(hora.getFonte()).isEqualTo(FonteAgregado.LEITURAS);
        assertThat(hora.totais()).isEqualTo(new Totais(20, 10, 10, 1, 5, 4, false, true));
        assertThat(hora.getLeituras()).isEqualTo(2);
    }

    @Test
    void horaComLeiturasGravadasUsaAsGravadasEOGeradorSoNosBlocosQueFaltam() {
        // Leituras gravadas com outra configuração (ou semente antiga) mandam: o gerador só completa.
        List<Leitura> gravadas = new ArrayList<>();
        for (Instant t = HORA; t.isBefore(HORA.plusSeconds(1800)); t = t.plusSeconds(10)) {
            gravadas.add(new Leitura(Leitura.idDe(forno.getId(), t), forno.getId(), t, StatusMaquina.OPERANDO, 199.0,
                    7, 7, 0, OrigemLeitura.SIMULADOR));
        }
        mongoTemplate.insertAll(gravadas);

        IndicadorHora hora = agregador.agregar(forno, HORA);

        List<Leitura> esperadas = new ArrayList<>(gravadas);
        for (Instant t = HORA.plusSeconds(1800); t.isBefore(HORA.plus(Duration.ofHours(1))); t = t.plusSeconds(10)) {
            esperadas.add(gerador.gerar(forno, t));
        }
        assertThat(hora.totais()).isEqualTo(Totais.de(esperadas));
        assertThat(hora.getLeituras()).isEqualTo(360);
        assertThat(hora.getFonte()).isEqualTo(FonteAgregado.LEITURAS);
    }

    @Test
    void comOSimuladorDesligadoHoraSemDispositivoFicaComoLacuna() {
        AgregadorHoras semSimulador = new AgregadorHoras(mongoTemplate, maquinas, gerador,
                new SimulacaoProperties(false, "America/Sao_Paulo", 60));

        assertThat(semSimulador.agregar(forno, HORA)).isNull();
        assertThat(semSimulador.preencher(AGORA)).isZero();
    }

    @Test
    void jobDaHoraFechadaGravaAHoraAnteriorDeCadaMaquinaAtiva() {
        desativar("Rotuladora 06");

        agregador.agregarHoraFechada(AGORA);
        agregador.agregarHoraFechada(AGORA.plusSeconds(60)); // de novo na mesma hora: não duplica

        assertThat(mongoTemplate.count(new Query(), IndicadorHora.class)).isEqualTo(5);
        assertThat(mongoTemplate.findAll(IndicadorHora.class)).allMatch(h -> h.getHora().equals(HORA));
    }

    @Test
    void preencheOsUltimos7DiasSoOQueFalta() {
        agregador.agregarHoraFechada(AGORA); // a última hora já existe

        int criados = agregador.preencher(AGORA);
        int deNovo = agregador.preencher(AGORA);

        assertThat(criados).isEqualTo(6 * AgregadorHoras.HORAS_PREENCHIDAS - 6);
        assertThat(deNovo).isZero();
        assertThat(mongoTemplate.count(new Query(), IndicadorHora.class)).isEqualTo(6L * AgregadorHoras.HORAS_PREENCHIDAS);
    }

    @Test
    void maquinaNovaNaoGanhaHistoricoDeAntesDeExistir() {
        forno.setEmOperacaoDesde(AGORA.minus(Duration.ofHours(3)).plusSeconds(600)); // 13:30 UTC
        mongoTemplate.save(forno);

        agregador.preencher(AGORA);

        // horas 13:00 (só a partir de 13:30), 14:00 e 15:00 UTC; nada antes de a máquina existir
        assertThat(mongoTemplate.count(Query.query(Criteria.where("maquinaId").is(forno.getId())), IndicadorHora.class))
                .isEqualTo(3);
        IndicadorHora parcial = mongoTemplate.findById(IndicadorHora.idDe(forno.getId(), Instant.parse("2026-11-10T13:00:00Z")),
                IndicadorHora.class);
        assertThat(parcial.getLeituras()).isEqualTo(180);
    }

    @Test
    void maquinaCriadaPelaApiGuardaDesdeQuandoOpera() {
        Instant antes = Instant.now();
        Maquina nova = maquinas.criar(new com.ambydata.ambydata_backend.maquina.MaquinaRequest("Nova 09",
                forno.getTipo(), "Setor", "Linha C", 30, forno.getFaixaTemperatura(), forno.getAlertas(), 10.0, 1.0,
                forno.getTurnoPlanejado(), new com.ambydata.ambydata_backend.maquina.ParametrosEnergia(10.0, 0.0, 0)));

        assertThat(nova.getEmOperacaoDesde()).isBetween(antes, Instant.now());
    }

    @Test
    void agregadosExpiramEm90Dias() {
        agregador.agregarHoraFechada(AGORA);
        var indices = mongoTemplate.getCollection("indicador_hora").listIndexes().into(new ArrayList<Document>());
        assertThat(indices).anyMatch(i -> i.get("key", Document.class).containsKey("hora")
                && i.get("expireAfterSeconds") instanceof Number segundos
                && segundos.longValue() == 90L * 24 * 3600);
    }

    private Leitura leituraDispositivo(Instant t, StatusMaquina status, int produzidas, int boas) {
        return new Leitura(Leitura.idDe(forno.getId(), t), forno.getId(), t, status, 180.0, produzidas, boas,
                status == StatusMaquina.PARADA ? 10 : 0, OrigemLeitura.DISPOSITIVO);
    }

    private void desativar(String nome) {
        Maquina m = mongoTemplate.findOne(Query.query(Criteria.where("nome").is(nome)), Maquina.class);
        m.setAtiva(false);
        mongoTemplate.save(m);
    }
}
