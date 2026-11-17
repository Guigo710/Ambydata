package com.ambydata.ambydata_backend.alerta;

import com.ambydata.ambydata_backend.chamado.Chamado;
import com.ambydata.ambydata_backend.chamado.ChamadoService;
import com.ambydata.ambydata_backend.chamado.EventoChamado;
import com.ambydata.ambydata_backend.chamado.PessoaChamado;
import com.ambydata.ambydata_backend.chamado.Prioridade;
import com.ambydata.ambydata_backend.chamado.StatusChamado;
import com.ambydata.ambydata_backend.chamado.TipoChamado;
import com.ambydata.ambydata_backend.chamado.TipoEvento;
import com.ambydata.ambydata_backend.indicadores.SituacaoTemperatura;
import com.ambydata.ambydata_backend.indicadores.Totais;
import com.ambydata.ambydata_backend.maquina.FaixaTemperatura;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import com.ambydata.ambydata_backend.notificacao.NotificacaoService;
import com.ambydata.ambydata_backend.simulacao.GeradorLeituras;
import com.ambydata.ambydata_backend.simulacao.Leitura;
import com.ambydata.ambydata_backend.simulacao.StatusMaquina;
import com.ambydata.ambydata_backend.usuario.Perfil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

// Confere os limites críticos de cada máquina ativa e abre o chamado automático
// (SPEC-chamados). Regras do plano do PR 3:
//   temperatura: a última leitura (dos últimos 5 min) está além do limite crítico;
//   parada: as leituras dos últimos `minutosParadoMax` são todas PARADA e cobrem ≥ 90% do tempo;
//   defeitos: na última hora, ≥ 100 peças e taxa de defeitos acima de `taxaDefeitosMax`.
// Sem duplicar (índice único parcial), no máximo um evento por hora no histórico e carência
// de 1 h depois de finalizar ou cancelar o automático da mesma máquina e causa.
@Service
public class DetectorAlertas {

    public static final String NOME_SISTEMA = "Sistema — limite ultrapassado";
    static final Duration LEITURA_RECENTE = Duration.ofMinutes(5);
    static final Duration CARENCIA = Duration.ofHours(1);
    static final Duration INTERVALO_ENTRE_EVENTOS = Duration.ofHours(1);
    static final int PECAS_MINIMAS = 100;
    static final double COBERTURA_MINIMA = 0.9;

    private static final Logger log = LoggerFactory.getLogger(DetectorAlertas.class);
    private static final Map<CausaAlerta, TipoChamado> TIPO = Map.of(
            CausaAlerta.TEMPERATURA_CRITICA, TipoChamado.TEMPERATURA,
            CausaAlerta.PARADA_PROLONGADA, TipoChamado.PARADA,
            CausaAlerta.DEFEITOS_ALTOS, TipoChamado.QUALIDADE);

    private final MongoTemplate mongoTemplate;
    private final MaquinaService maquinas;
    private final NotificacaoService notificacoes;

    public DetectorAlertas(MongoTemplate mongoTemplate, MaquinaService maquinas, NotificacaoService notificacoes) {
        this.mongoTemplate = mongoTemplate;
        this.maquinas = maquinas;
        this.notificacoes = notificacoes;
    }

    public void verificar(Instant agora) {
        for (Maquina maquina : maquinas.listar(true)) {
            try {
                for (Deteccao d : avaliar(maquina, agora)) {
                    registrar(maquina, d, agora);
                }
            } catch (RuntimeException e) {
                log.warn("Alertas: {} não verificada: {}", maquina.getNome(), e.getMessage());
            }
        }
    }

    List<Deteccao> avaliar(Maquina m, Instant agora) {
        int minutosParada = m.getAlertas().minutosParadoMax();
        Duration janela = Duration.ofMinutes(Math.max(60, minutosParada));
        List<Leitura> leituras = mongoTemplate.find(Query.query(Criteria.where("maquinaId").is(m.getId())
                .and("instante").gt(agora.minus(janela)).lte(agora)), Leitura.class);
        List<Deteccao> deteccoes = new ArrayList<>();
        temperatura(m, leituras, agora, deteccoes);
        parada(m, leituras, agora, minutosParada, deteccoes);
        defeitos(m, leituras, agora, deteccoes);
        return deteccoes;
    }

    private static void temperatura(Maquina m, List<Leitura> leituras, Instant agora, List<Deteccao> saida) {
        leituras.stream().filter(l -> l.getInstante().isAfter(agora.minus(LEITURA_RECENTE)))
                .max(Comparator.comparing(Leitura::getInstante))
                .filter(l -> SituacaoTemperatura.de(l.getTemperatura(), m.getFaixaTemperatura(),
                        m.getAlertas().percentualCritico()) == SituacaoTemperatura.CRITICO)
                .ifPresent(l -> {
                    FaixaTemperatura faixa = m.getFaixaTemperatura();
                    FaixaTemperatura critica = faixa.critica(m.getAlertas().percentualCritico());
                    boolean acima = l.getTemperatura() > critica.max();
                    String limite = acima ? "acima do limite crítico de " + numero(critica.max()) + " °C"
                            : "abaixo do limite crítico de " + numero(critica.min()) + " °C";
                    saida.add(new Deteccao(CausaAlerta.TEMPERATURA_CRITICA,
                            "Temperatura de " + numero(l.getTemperatura()) + " °C, " + limite
                                    + " (faixa " + numero(faixa.min()) + " a " + numero(faixa.max()) + " °C).",
                            "temperatura crítica (" + numero(l.getTemperatura()) + " °C)"));
                });
    }

    private static void parada(Maquina m, List<Leitura> leituras, Instant agora, int minutos, List<Deteccao> saida) {
        List<Leitura> janela = leituras.stream().filter(l -> l.getInstante().isAfter(agora.minus(Duration.ofMinutes(minutos)))).toList();
        long esperadas = minutos * 60L / GeradorLeituras.SEGUNDOS_POR_BLOCO;
        boolean todasParadas = !janela.isEmpty() && janela.stream().allMatch(l -> l.getStatus() == StatusMaquina.PARADA);
        if (todasParadas && janela.size() >= COBERTURA_MINIMA * esperadas) {
            saida.add(new Deteccao(CausaAlerta.PARADA_PROLONGADA,
                    "Máquina parada há pelo menos " + minutos + " min dentro do turno (limite: " + minutos + " min).",
                    "parada há " + minutos + " min"));
        }
    }

    private static void defeitos(Maquina m, List<Leitura> leituras, Instant agora, List<Deteccao> saida) {
        Totais hora = Totais.de(leituras.stream().filter(l -> l.getInstante().isAfter(agora.minus(Duration.ofHours(1)))).toList());
        if (hora.pecasProduzidas() < PECAS_MINIMAS) {
            return;
        }
        double taxa = 100.0 * (hora.pecasProduzidas() - hora.pecasBoas()) / hora.pecasProduzidas();
        double limite = m.getAlertas().taxaDefeitosMax();
        if (taxa > limite) {
            saida.add(new Deteccao(CausaAlerta.DEFEITOS_ALTOS,
                    String.format(Locale.forLanguageTag("pt-BR"), "Defeitos na última hora: %.1f%% (%d de %d peças), acima do limite de %s%%.",
                            taxa, hora.pecasProduzidas() - hora.pecasBoas(), hora.pecasProduzidas(), numero(limite)),
                    String.format(Locale.forLanguageTag("pt-BR"), "defeitos em %.1f%%", taxa)));
        }
    }

    private void registrar(Maquina m, Deteccao d, Instant agora) {
        Criteria aberto = Criteria.where("maquinaId").is(m.getId()).and("causaAutomatica").is(d.causa()).and("ativoAutomatico").is(true);
        if (mongoTemplate.exists(Query.query(aberto), Chamado.class)) {
            acrescentarEvento(aberto, d, agora);
            return;
        }
        if (emCarencia(m, d.causa(), agora)) {
            return;
        }
        Chamado c = novo(m, d, agora);
        try {
            mongoTemplate.insert(c);
        } catch (DuplicateKeyException e) {
            return; // outro verificador abriu primeiro: o chamado já existe
        }
        notificacoes.criarParaPerfil(Perfil.ENGENHEIRO,
                "Chamado automático: " + m.getNome() + " — " + d.resumo() + ".", ChamadoService.link(c));
    }

    // Evento no histórico do chamado que já existe, no máximo um por hora.
    private void acrescentarEvento(Criteria aberto, Deteccao d, Instant agora) {
        Criteria podeRegistrar = new Criteria().orOperator(
                Criteria.where("ultimoEventoAutomaticoEm").exists(false),
                Criteria.where("ultimoEventoAutomaticoEm").lte(agora.minus(INTERVALO_ENTRE_EVENTOS)));
        mongoTemplate.updateFirst(Query.query(new Criteria().andOperator(aberto, podeRegistrar)), new Update()
                .set("ultimoEventoAutomaticoEm", agora)
                .push("historico", new EventoChamado(agora, TipoEvento.NOVA_DETECCAO, "Detectado de novo: " + d.descricao(), "Sistema")),
                Chamado.class);
    }

    private boolean emCarencia(Maquina m, CausaAlerta causa, Instant agora) {
        Instant limite = agora.minus(CARENCIA);
        return mongoTemplate.exists(Query.query(Criteria.where("maquinaId").is(m.getId()).and("causaAutomatica").is(causa)
                .orOperator(Criteria.where("finalizadoEm").gte(limite), Criteria.where("canceladoEm").gte(limite))), Chamado.class);
    }

    private static Chamado novo(Maquina m, Deteccao d, Instant agora) {
        Chamado c = new Chamado();
        c.setTipo(TIPO.get(d.causa()));
        c.setMaquinaId(m.getId());
        c.setMaquinaNome(m.getNome());
        c.setSetor(m.getSetor());
        c.setLinha(m.getLinha());
        c.setDescricao(d.descricao());
        c.setPrioridade(Prioridade.CRITICA);
        c.setStatus(StatusChamado.ABERTO);
        c.setAbertoPor(new PessoaChamado(null, NOME_SISTEMA, true));
        c.setAbertoEm(agora);
        c.setCausaAutomatica(d.causa());
        c.setAtivoAutomatico(true);
        c.setUltimoEventoAutomaticoEm(agora);
        c.setHistorico(new ArrayList<>(List.of(new EventoChamado(agora, TipoEvento.ABERTO, "Aberto automaticamente: " + d.descricao(), "Sistema"))));
        return c;
    }

    // "230,5", "220", "8".
    private static String numero(double valor) {
        String texto = String.format(Locale.forLanguageTag("pt-BR"), "%.1f", valor);
        return texto.endsWith(",0") ? texto.substring(0, texto.length() - 2) : texto;
    }
}
