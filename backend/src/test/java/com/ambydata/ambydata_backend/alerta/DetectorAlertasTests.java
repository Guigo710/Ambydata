package com.ambydata.ambydata_backend.alerta;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.chamado.Chamado;
import com.ambydata.ambydata_backend.chamado.ChamadoService;
import com.ambydata.ambydata_backend.chamado.Prioridade;
import com.ambydata.ambydata_backend.chamado.StatusChamado;
import com.ambydata.ambydata_backend.chamado.TipoChamado;
import com.ambydata.ambydata_backend.chamado.TipoEvento;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.migracao.M002MaquinasIniciais;
import com.ambydata.ambydata_backend.notificacao.Notificacao;
import com.ambydata.ambydata_backend.simulacao.Leitura;
import com.ambydata.ambydata_backend.simulacao.OrigemLeitura;
import com.ambydata.ambydata_backend.simulacao.StatusMaquina;
import com.ambydata.ambydata_backend.usuario.Perfil;
import com.ambydata.ambydata_backend.usuario.Usuario;
import com.ambydata.ambydata_backend.usuario.UsuarioRepository;
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
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfig.class)
class DetectorAlertasTests {

    // 13:20 em São Paulo: dentro do turno das máquinas (06:00–22:00).
    private static final Instant AGORA = Instant.parse("2026-11-10T16:20:00Z");

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private M002MaquinasIniciais m002;

    @Autowired
    private DetectorAlertas detector;

    @Autowired
    private ChamadoService chamados;

    @Autowired
    private UsuarioRepository usuarios;

    private Usuario engenheiro;
    private Maquina forno;
    private Maquina envasadora;
    private Maquina seladora;

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        m002.aplicar(mongoTemplate);
        mongoTemplate.remove(new Query(), Leitura.class);
        mongoTemplate.remove(new Query(), Chamado.class);
        mongoTemplate.remove(new Query(), Notificacao.class);
        usuarios.deleteAll();
        engenheiro = usuarios.save(new Usuario(null, "Eng", "eng@x.com", "hash", Perfil.ENGENHEIRO, true));
        usuarios.save(new Usuario(null, "Op", "op@x.com", "hash", Perfil.OPERARIO, true));
        forno = maquina("Forno 02");
        envasadora = maquina("Envasadora 04");
        seladora = maquina("Seladora 05");
    }

    @Test
    void temperaturaAlemDoLimiteAbreChamadoCriticoEAvisaOsEngenheiros() {
        leitura(forno, AGORA.minusSeconds(10), StatusMaquina.OPERANDO, 230.5, 5, 5);

        detector.verificar(AGORA);

        Chamado c = unico();
        assertThat(c.getPrioridade()).isEqualTo(Prioridade.CRITICA);
        assertThat(c.getTipo()).isEqualTo(TipoChamado.TEMPERATURA);
        assertThat(c.getCausaAutomatica()).isEqualTo(CausaAlerta.TEMPERATURA_CRITICA);
        assertThat(c.getAbertoPor().sistema()).isTrue();
        assertThat(c.getAbertoPor().nome()).isEqualTo("Sistema — limite ultrapassado");
        assertThat(c.getMaquinaNome()).isEqualTo("Forno 02");
        assertThat(c.getDescricao()).contains("230,5 °C").contains("220 °C");
        List<Notificacao> avisos = mongoTemplate.findAll(Notificacao.class);
        assertThat(avisos).singleElement().satisfies(n -> {
            assertThat(n.getUsuarioId()).isEqualTo(engenheiro.getId());
            assertThat(n.getTexto()).contains("Forno 02");
            assertThat(n.getLink()).isEqualTo("/manutencao?chamado=" + c.getId());
        });
    }

    @Test
    void temperaturaNaFaixaOuLeituraAntigaNaoAbreNada() {
        leitura(forno, AGORA.minusSeconds(10), StatusMaquina.OPERANDO, 205.0, 5, 5);  // alerta, não crítico
        leitura(envasadora, AGORA.minus(Duration.ofMinutes(10)), StatusMaquina.OPERANDO, 99.0, 5, 5); // velha

        detector.verificar(AGORA);

        assertThat(mongoTemplate.count(new Query(), Chamado.class)).isZero();
    }

    @Test
    void naoDuplicaEAcrescentaNoHistoricoNoMaximoUmaVezPorHora() {
        leitura(forno, AGORA.minusSeconds(10), StatusMaquina.OPERANDO, 230.5, 5, 5);
        detector.verificar(AGORA);
        leitura(forno, AGORA.plusSeconds(20), StatusMaquina.OPERANDO, 231.0, 5, 5);
        detector.verificar(AGORA.plusSeconds(30));
        assertThat(unico().getHistorico()).hasSize(1);

        Instant depois = AGORA.plus(Duration.ofMinutes(61));
        leitura(forno, depois.minusSeconds(10), StatusMaquina.OPERANDO, 228.0, 5, 5);
        detector.verificar(depois);

        Chamado c = unico();
        assertThat(c.getHistorico()).hasSize(2);
        assertThat(c.getHistorico().get(1).tipo()).isEqualTo(TipoEvento.NOVA_DETECCAO);
        assertThat(c.getHistorico().get(1).texto()).contains("228 °C");
        assertThat(mongoTemplate.count(new Query(), Notificacao.class)).isEqualTo(1);
    }

    @Test
    void depoisDeFinalizarEsperaUmaHoraAntesDeReabrir() {
        leitura(forno, AGORA.minusSeconds(10), StatusMaquina.OPERANDO, 230.5, 5, 5);
        detector.verificar(AGORA);
        Chamado c = unico();
        chamados.assumir(c.getId(), engenheiro);
        chamados.finalizar(c.getId(), "Termostato ajustado.", engenheiro);

        Instant logo = Instant.now().plus(Duration.ofMinutes(10));
        leitura(forno, logo.minusSeconds(10), StatusMaquina.OPERANDO, 232.0, 5, 5);
        detector.verificar(logo);
        assertThat(mongoTemplate.count(new Query(), Chamado.class)).isEqualTo(1);

        Instant depois = Instant.now().plus(Duration.ofMinutes(61));
        leitura(forno, depois.minusSeconds(10), StatusMaquina.OPERANDO, 232.0, 5, 5);
        detector.verificar(depois);
        assertThat(mongoTemplate.count(Query.query(Criteria.where("status").is(StatusChamado.ABERTO)), Chamado.class)).isEqualTo(1);
    }

    @Test
    void paradaContinuaAlemDoLimiteAbreChamadoDeParada() {
        // minutosParadoMax = 15: 15 min de leituras todas paradas.
        for (Instant t = AGORA.minus(Duration.ofMinutes(15)).plusSeconds(10); !t.isAfter(AGORA); t = t.plusSeconds(10)) {
            leitura(envasadora, t, StatusMaquina.PARADA, 24.0, 0, 0);
        }

        detector.verificar(AGORA);

        Chamado c = unico();
        assertThat(c.getCausaAutomatica()).isEqualTo(CausaAlerta.PARADA_PROLONGADA);
        assertThat(c.getTipo()).isEqualTo(TipoChamado.PARADA);
        assertThat(c.getDescricao()).contains("15 min");
    }

    @Test
    void paradaInterrompidaOuSemLeiturasSuficientesNaoAbre() {
        for (Instant t = AGORA.minus(Duration.ofMinutes(15)).plusSeconds(10); !t.isAfter(AGORA); t = t.plusSeconds(10)) {
            boolean voltou = t.equals(AGORA.minus(Duration.ofMinutes(5)));
            leitura(envasadora, t, voltou ? StatusMaquina.OPERANDO : StatusMaquina.PARADA, 24.0, voltou ? 9 : 0, voltou ? 9 : 0);
        }
        for (Instant t = AGORA.minus(Duration.ofMinutes(8)); !t.isAfter(AGORA); t = t.plusSeconds(10)) {
            leitura(forno, t, StatusMaquina.PARADA, 180.0, 0, 0); // só 8 dos 15 min com leitura
        }

        detector.verificar(AGORA);

        assertThat(mongoTemplate.count(new Query(), Chamado.class)).isZero();
    }

    @Test
    void defeitosDaUltimaHoraAcimaDoLimiteAbremChamadoDeQualidade() {
        // taxaDefeitosMax = 8%: 360 blocos × 10 peças, 12% defeituosas.
        for (Instant t = AGORA.minus(Duration.ofMinutes(60)).plusSeconds(10); !t.isAfter(AGORA); t = t.plusSeconds(10)) {
            leitura(seladora, t, StatusMaquina.OPERANDO, 155.0, 25, 22);
        }

        detector.verificar(AGORA);

        Chamado c = unico();
        assertThat(c.getCausaAutomatica()).isEqualTo(CausaAlerta.DEFEITOS_ALTOS);
        assertThat(c.getTipo()).isEqualTo(TipoChamado.QUALIDADE);
        assertThat(c.getDescricao()).contains("12,0%").contains("8%");
    }

    @Test
    void poucasPecasNaoBastamParaAlarmarDefeitos() {
        for (Instant t = AGORA.minus(Duration.ofMinutes(5)); !t.isAfter(AGORA); t = t.plusSeconds(10)) {
            leitura(seladora, t, StatusMaquina.OPERANDO, 155.0, 2, 1); // 50% de defeito, mas < 100 peças
        }
        detector.verificar(AGORA);
        assertThat(mongoTemplate.count(new Query(), Chamado.class)).isZero();
    }

    @Test
    void maquinaInativaNaoEVerificada() {
        forno.setAtiva(false);
        mongoTemplate.save(forno);
        leitura(forno, AGORA.minusSeconds(10), StatusMaquina.OPERANDO, 230.5, 5, 5);
        detector.verificar(AGORA);
        assertThat(mongoTemplate.count(new Query(), Chamado.class)).isZero();
    }

    @Test
    void doisDetectoresAoMesmoTempoAbremUmChamadoSo() throws Exception {
        leitura(forno, AGORA.minusSeconds(10), StatusMaquina.OPERANDO, 230.5, 5, 5);
        ExecutorService pool = Executors.newFixedThreadPool(4);
        List<Callable<Object>> rodadas = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            rodadas.add(Executors.callable(() -> detector.verificar(AGORA)));
        }
        for (var f : pool.invokeAll(rodadas)) {
            f.get();
        }
        pool.shutdown();

        assertThat(mongoTemplate.count(new Query(), Chamado.class)).isEqualTo(1);
        assertThat(mongoTemplate.count(new Query(), Notificacao.class)).isEqualTo(1);
    }

    @Test
    void cicloSimuladoDoFornoAbreUmChamadoCriticoSoEmDuasHoras() {
        // Critério 4 da SPEC-chamados: o Forno 02 (cenário de aquecimento) passa do limite crítico
        // uma vez a cada ciclo de 2 h; com o detector rodando a cada 30 s, abre um chamado só.
        var gerador = new com.ambydata.ambydata_backend.simulacao.GeradorLeituras(java.time.ZoneId.of("America/Sao_Paulo"));
        Instant inicio = Instant.parse("2026-11-10T12:00:00Z"); // 09:00 em SP, dentro do turno
        for (Instant t = inicio; t.isBefore(inicio.plus(Duration.ofHours(2))); t = t.plusSeconds(10)) {
            mongoTemplate.save(gerador.gerar(forno, t));
            if (t.getEpochSecond() % 30 == 0) {
                detector.verificar(t);
            }
        }

        List<Chamado> todos = mongoTemplate.findAll(Chamado.class);
        assertThat(todos).filteredOn(c -> c.getCausaAutomatica() == CausaAlerta.TEMPERATURA_CRITICA).singleElement()
                .satisfies(c -> {
                    assertThat(c.getMaquinaNome()).isEqualTo("Forno 02");
                    assertThat(c.getPrioridade()).isEqualTo(Prioridade.CRITICA);
                    assertThat(c.getStatus()).isEqualTo(StatusChamado.ABERTO);
                });
    }

    private Chamado unico() {
        List<Chamado> todos = mongoTemplate.findAll(Chamado.class);
        assertThat(todos).hasSize(1);
        return todos.getFirst();
    }

    private void leitura(Maquina m, Instant t, StatusMaquina status, double temperatura, int produzidas, int boas) {
        mongoTemplate.save(new Leitura(Leitura.idDe(m.getId(), t), m.getId(), t, status, temperatura, produzidas, boas,
                status == StatusMaquina.PARADA ? 10 : 0, OrigemLeitura.SIMULADOR));
    }

    private Maquina maquina(String nome) {
        return mongoTemplate.findOne(Query.query(Criteria.where("nome").is(nome)), Maquina.class);
    }
}
