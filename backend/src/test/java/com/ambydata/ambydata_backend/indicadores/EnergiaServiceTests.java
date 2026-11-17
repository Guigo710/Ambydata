package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.config.CampoInvalidoException;
import com.ambydata.ambydata_backend.energia.CalculadoraEnergia;
import com.ambydata.ambydata_backend.energia.TarifasEnergia;
import com.ambydata.ambydata_backend.energia.TarifasService;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import com.ambydata.ambydata_backend.migracao.M002MaquinasIniciais;
import com.ambydata.ambydata_backend.migracao.M003Energia;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

@SpringBootTest
@Import(TestcontainersConfig.class)
class EnergiaServiceTests {

    private static final Instant AGORA = Instant.parse("2026-11-10T16:20:00Z");

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private MaquinaService maquinas;

    @Autowired
    private TarifasService tarifas;

    @Autowired
    private M002MaquinasIniciais m002;

    @Autowired
    private M003Energia m003;

    private HistoricoService historico;
    private EnergiaService servico;

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        mongoTemplate.dropCollection(TarifasEnergia.class);
        m002.aplicar(mongoTemplate);
        m003.aplicar(mongoTemplate);
        mongoTemplate.remove(new Query(), Leitura.class);
        mongoTemplate.remove(new Query(), IndicadorHora.class);
        new AgregadorHoras(mongoTemplate, maquinas, new GeradorLeituras(ZoneId.of("America/Sao_Paulo")),
                new SimulacaoProperties(true, "America/Sao_Paulo", 60)).preencher(AGORA);
        historico = new HistoricoService(mongoTemplate, maquinas);
        servico = new EnergiaService(historico, tarifas);
    }

    @Test
    void balancoDeCadaMaquinaUsaOTempoOperandoDoPeriodo() {
        RelatorioEnergia r = servico.relatorio("24h", AGORA);

        Maquina envasadora = maquina("Envasadora 04");
        long operando = historico.historico(envasadora.getId(), 24, AGORA).total().totais().segundosOperando();
        EnergiaMaquina e = r.maquinas().stream().filter(m -> m.nome().equals("Envasadora 04")).findFirst().orElseThrow();
        assertThat(e.balanco()).isEqualTo(CalculadoraEnergia.calcular(operando, envasadora.getEnergia(), tarifas.obter()));
        assertThat(e.balanco().energiaInjetadaKwh()).isPositive();
        assertThat(r.maquinas()).hasSize(6);
    }

    @Test
    void linhasSomamAsMaquinasEOTotalSomaOsEncargos() {
        RelatorioEnergia r = servico.relatorio("24h", AGORA);

        double linhaB = r.maquinas().stream().filter(m -> m.linha().equals("Linha B")).mapToDouble(m -> m.balanco().custoLiquido()).sum();
        assertThat(r.linhas()).extracting(EnergiaLinha::linha).containsExactly("Linha A", "Linha B");
        assertThat(r.linhas().get(1).soma().custoLiquido()).isCloseTo(linhaB, within(1e-6));

        double maquinasLiquido = r.maquinas().stream().mapToDouble(m -> m.balanco().custoLiquido()).sum();
        assertThat(r.total().horasPeriodo()).isEqualTo(24.0);
        assertThat(r.total().encargosDemanda()).isCloseTo(200.0, within(1e-9));
        assertThat(r.total().custoLiquido()).isCloseTo(maquinasLiquido + 200.0, within(1e-6));
        assertThat(r.tarifas().getTarifaCheia()).isEqualTo(0.85);
    }

    @Test
    void seteDiasTemEncargosDaSemana() {
        assertThat(servico.relatorio("7d", AGORA).total().encargosDemanda()).isCloseTo(1400.0, within(1e-9));
    }

    @Test
    void maquinaSemParametrosDeEnergiaApareceMarcada() {
        Maquina forno = maquina("Forno 02");
        forno.setEnergia(null);
        mongoTemplate.save(forno);

        EnergiaMaquina e = servico.relatorio("24h", AGORA).maquinas().stream()
                .filter(m -> m.nome().equals("Forno 02")).findFirst().orElseThrow();

        assertThat(e.semParametros()).isTrue();
        assertThat(e.balanco()).isNull();
    }

    @Test
    void periodoInvalidoERecusado() {
        assertThatThrownBy(() -> servico.relatorio("1ano", AGORA)).isInstanceOf(CampoInvalidoException.class);
    }

    private Maquina maquina(String nome) {
        return mongoTemplate.findOne(Query.query(Criteria.where("nome").is(nome)), Maquina.class);
    }
}
