package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.config.CampoInvalidoException;
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

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

@SpringBootTest
@Import(TestcontainersConfig.class)
class HistoricoServiceTests {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private static final Instant AGORA = Instant.parse("2026-11-10T16:20:00Z");
    private static final Instant ULTIMA_HORA_FECHADA = Instant.parse("2026-11-10T15:00:00Z");

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private MaquinaService maquinas;

    @Autowired
    private M002MaquinasIniciais m002;

    private final GeradorLeituras gerador = new GeradorLeituras(FUSO);
    private HistoricoService servico;

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        m002.aplicar(mongoTemplate);
        mongoTemplate.remove(new Query(), Leitura.class);
        mongoTemplate.remove(new Query(), IndicadorHora.class);
        new AgregadorHoras(mongoTemplate, maquinas, gerador, new SimulacaoProperties(true, "America/Sao_Paulo", 60))
                .preencher(AGORA);
        servico = new HistoricoService(mongoTemplate, maquinas);
    }

    @Test
    void historicoDe24HorasFechadasComOTotalIgualAsLeiturasDoPeriodo() {
        Maquina envasadora = maquina("Envasadora 04");

        Historico h = servico.historico(envasadora.getId(), 24, AGORA);

        assertThat(h.horas()).hasSize(24);
        assertThat(h.horas().getFirst().hora()).isEqualTo(ULTIMA_HORA_FECHADA.minus(Duration.ofHours(23)));
        assertThat(h.horas().getLast().hora()).isEqualTo(ULTIMA_HORA_FECHADA);
        assertThat(h.horas()).allMatch(p -> !p.semDados() && p.fonte() == FonteAgregado.GERADOR);
        Instant inicio = ULTIMA_HORA_FECHADA.minus(Duration.ofHours(23));
        assertThat(h.total().totais()).isEqualTo(Totais.de(geradas(envasadora, inicio, ULTIMA_HORA_FECHADA.plus(Duration.ofHours(1)))));
        assertThat(h.total().inicio()).isEqualTo(inicio);
        assertThat(h.total().fim()).isEqualTo(ULTIMA_HORA_FECHADA.plus(Duration.ofHours(1)));
    }

    @Test
    void horaSemAgregadoApareceComoSemDados() {
        Maquina forno = maquina("Forno 02");
        mongoTemplate.remove(Query.query(Criteria.where("_id").is(IndicadorHora.idDe(forno.getId(), ULTIMA_HORA_FECHADA))),
                IndicadorHora.class);

        PontoHistorico ultima = servico.historico(forno.getId(), 24, AGORA).horas().getLast();

        assertThat(ultima.semDados()).isTrue();
        assertThat(ultima.totais()).isNull();
        assertThat(ultima.indicadores()).isNull();
    }

    @Test
    void horasForaDoLimiteSaoRecusadas() {
        String id = maquina("Forno 02").getId();
        assertThatThrownBy(() -> servico.historico(id, 0, AGORA)).isInstanceOf(CampoInvalidoException.class);
        assertThatThrownBy(() -> servico.historico(id, 169, AGORA)).isInstanceOf(CampoInvalidoException.class);
    }

    @Test
    void comparativoPorLinhaSomaAsMaquinasEUsaACadenciaDeCada() {
        Comparativo c = servico.comparativo("24h", "linha", AGORA);

        assertThat(c.grupos()).extracting(GrupoComparativo::grupo).containsExactly("Linha A", "Linha B");
        GrupoComparativo linhaA = c.grupos().getFirst();
        assertThat(linhaA.maquinas()).containsExactly("Forno 02", "Misturadora 01", "Resfriador 03");

        Totais soma = Totais.VAZIO;
        double ideal = 0;
        for (String nome : linhaA.maquinas()) {
            Maquina m = maquina(nome);
            Totais t = servico.historico(m.getId(), 24, AGORA).total().totais();
            soma = soma.juntar(t);
            ideal += CalculadoraIndicadores.pecasIdeais(t, m.getCadenciaIdeal());
        }
        assertThat(linhaA.totais()).isEqualTo(soma);
        assertThat(linhaA.indicadores().performance()).isCloseTo(soma.pecasProduzidas() / ideal, within(1e-9));
        assertThat(c.inicio()).isEqualTo(ULTIMA_HORA_FECHADA.minus(Duration.ofHours(23)));
    }

    @Test
    void comparativoPorSetorEPorMaquinaEm7Dias() {
        Comparativo setor = servico.comparativo("7d", "setor", AGORA);
        assertThat(setor.inicio()).isEqualTo(ULTIMA_HORA_FECHADA.minus(Duration.ofHours(167)));
        assertThat(setor.grupos()).filteredOn(g -> g.grupo().equals("Embalagem")).singleElement()
                .satisfies(g -> assertThat(g.maquinas()).containsExactly("Rotuladora 06", "Seladora 05"));

        Comparativo porMaquina = servico.comparativo("7d", "maquina", AGORA);
        assertThat(porMaquina.grupos()).hasSize(6);
        GrupoComparativo envasadora = porMaquina.grupos().stream().filter(g -> g.grupo().equals("Envasadora 04")).findFirst().orElseThrow();
        assertThat(envasadora.indicadores().disponibilidade()).isLessThan(0.75);
    }

    @Test
    void periodoEAgrupamentoInvalidosSaoRecusados() {
        assertThatThrownBy(() -> servico.comparativo("30d", "linha", AGORA))
                .isInstanceOf(CampoInvalidoException.class).hasFieldOrPropertyWithValue("campo", "periodo");
        assertThatThrownBy(() -> servico.comparativo("24h", "turno", AGORA))
                .isInstanceOf(CampoInvalidoException.class).hasFieldOrPropertyWithValue("campo", "por");
    }

    @Test
    void financeiroPorMaquinaPorLinhaETotal() {
        RelatorioFinanceiro r = servico.financeiro("24h", AGORA);

        assertThat(r.maquinas()).hasSize(6);
        FinanceiroMaquina forno = r.maquinas().stream().filter(m -> m.nome().equals("Forno 02")).findFirst().orElseThrow();
        Maquina m = maquina("Forno 02");
        Totais t = servico.historico(m.getId(), 24, AGORA).total().totais();
        assertThat(forno.financeiro()).isEqualTo(CalculadoraIndicadores.financeiro(t, m.getCustoHora(), m.getValorPorPeca()));
        assertThat(forno.horasPlanejadas()).isCloseTo(t.segundosPlanejados() / 3600.0, within(1e-9));

        double lucroLinhaA = r.maquinas().stream().filter(x -> x.linha().equals("Linha A")).mapToDouble(x -> x.financeiro().lucro()).sum();
        assertThat(r.linhas()).extracting(FinanceiroGrupo::linha).containsExactly("Linha A", "Linha B");
        assertThat(r.linhas().getFirst().financeiro().lucro()).isCloseTo(lucroLinhaA, within(1e-6));
        assertThat(r.total().lucro()).isCloseTo(r.maquinas().stream().mapToDouble(x -> x.financeiro().lucro()).sum(), within(1e-6));
    }

    private Maquina maquina(String nome) {
        return mongoTemplate.findOne(Query.query(Criteria.where("nome").is(nome)), Maquina.class);
    }

    // Leituras do gerador em [de, ate).
    private List<Leitura> geradas(Maquina m, Instant de, Instant ate) {
        List<Leitura> leituras = new ArrayList<>();
        for (Instant t = de; t.isBefore(ate); t = t.plusSeconds(10)) {
            leituras.add(gerador.gerar(m, t));
        }
        return leituras;
    }
}
