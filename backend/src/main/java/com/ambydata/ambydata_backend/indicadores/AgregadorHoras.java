package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import com.ambydata.ambydata_backend.simulacao.GeradorLeituras;
import com.ambydata.ambydata_backend.simulacao.Leitura;
import com.ambydata.ambydata_backend.simulacao.OrigemLeitura;
import com.ambydata.ambydata_backend.simulacao.SimulacaoProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.BulkOperationException;
import org.springframework.data.mongodb.core.BulkOperations;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.DoubleSummaryStatistics;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Set;

// Monta o agregado de cada hora fechada a partir das leituras gravadas; as horas (ou os blocos)
// em que o backend dormiu são completados pelo gerador quando a máquina é simulada (ver agregar).
@Component
public class AgregadorHoras {

    public static final int HORAS_PREENCHIDAS = 7 * 24;

    private static final Logger log = LoggerFactory.getLogger(AgregadorHoras.class);
    private static final Duration HORA = Duration.ofHours(1);
    private static final int CHAVE_REPETIDA = 11000;

    private final MongoTemplate mongoTemplate;
    private final MaquinaService maquinas;
    private final GeradorLeituras gerador;
    private final SimulacaoProperties simulacao;

    public AgregadorHoras(MongoTemplate mongoTemplate, MaquinaService maquinas, GeradorLeituras gerador,
            SimulacaoProperties simulacao) {
        this.mongoTemplate = mongoTemplate;
        this.maquinas = maquinas;
        this.gerador = gerador;
        this.simulacao = simulacao;
    }

    // Agregado de uma hora; null se não houver base (lacuna ou antes de a máquina existir).
    public IndicadorHora agregar(Maquina maquina, Instant instante) {
        Instant inicio = instante.truncatedTo(ChronoUnit.HOURS);
        return agregar(maquina, inicio, gravadas(maquina.getId(), inicio, inicio.plus(HORA)));
    }

    // Job da hora fechada: regrava (upsert) a hora anterior de cada máquina ativa.
    public void agregarHoraFechada(Instant agora) {
        Instant hora = agora.truncatedTo(ChronoUnit.HOURS).minus(HORA);
        for (Maquina maquina : maquinas.listar(true)) {
            try {
                IndicadorHora agregado = agregar(maquina, hora);
                if (agregado != null) {
                    mongoTemplate.save(agregado);
                }
            } catch (RuntimeException e) {
                log.warn("Indicadores: hora {} de {} não agregada: {}", hora, maquina.getNome(), e.getMessage());
            }
        }
    }

    // Preenche as horas fechadas dos últimos 7 dias que faltam; devolve quantas criou.
    public int preencher(Instant agora) {
        Instant fim = agora.truncatedTo(ChronoUnit.HOURS);
        Instant inicio = fim.minus(HORA.multipliedBy(HORAS_PREENCHIDAS));
        int criados = 0;
        for (Maquina maquina : maquinas.listar(true)) {
            Set<String> existentes = idsExistentes(maquina.getId(), inicio, fim);
            // Leituras brutas só existem nas últimas 48 h (TTL): uma consulta por máquina.
            Map<Instant, List<Leitura>> porHora = gravadas(maquina.getId(), inicio, fim).stream()
                    .collect(Collectors.groupingBy(l -> l.getInstante().truncatedTo(ChronoUnit.HOURS)));
            List<IndicadorHora> faltando = new ArrayList<>();
            for (Instant hora = inicio; hora.isBefore(fim); hora = hora.plus(HORA)) {
                if (!existentes.contains(IndicadorHora.idDe(maquina.getId(), hora))) {
                    IndicadorHora agregado = agregar(maquina, hora, porHora.getOrDefault(hora, List.of()));
                    if (agregado != null) {
                        faltando.add(agregado);
                    }
                }
            }
            criados += inserirIgnorandoRepetidos(faltando);
        }
        return criados;
    }

    // Leituras gravadas mandam (são o que de fato aconteceu, mesmo que a máquina tenha mudado de
    // configuração depois). Hora com dispositivo: só elas; os buracos são lacunas reais. Hora sem
    // dispositivo e com o simulador ligado: o gerador completa só os blocos de 10 s que faltam.
    // Nada antes de emOperacaoDesde (a hora em que a máquina foi criada conta a partir dali).
    private IndicadorHora agregar(Maquina maquina, Instant inicio, List<Leitura> gravadas) {
        Instant desde = maquina.getEmOperacaoDesde();
        if (desde != null && !inicio.plus(HORA).isAfter(desde)) {
            return null;
        }
        List<Leitura> leituras = new ArrayList<>(gravadas.stream()
                .filter(l -> desde == null || !l.getInstante().isBefore(desde)).toList());
        boolean comDispositivo = leituras.stream().anyMatch(l -> l.getOrigem() == OrigemLeitura.DISPOSITIVO);
        if (!comDispositivo && simulacao.ativo()) {
            Set<Long> blocosGravados = new HashSet<>();
            leituras.forEach(l -> blocosGravados.add(Math.floorDiv(l.getInstante().getEpochSecond(), GeradorLeituras.SEGUNDOS_POR_BLOCO)));
            for (Instant t = inicio; t.isBefore(inicio.plus(HORA)); t = t.plusSeconds(GeradorLeituras.SEGUNDOS_POR_BLOCO)) {
                boolean antesDeExistir = desde != null && t.isBefore(desde);
                if (!antesDeExistir && !blocosGravados.contains(Math.floorDiv(t.getEpochSecond(), GeradorLeituras.SEGUNDOS_POR_BLOCO))) {
                    leituras.add(gerador.gerar(maquina, t));
                }
            }
        }
        if (leituras.isEmpty()) {
            return null;
        }
        FonteAgregado fonte = gravadas.isEmpty() ? FonteAgregado.GERADOR : FonteAgregado.LEITURAS;
        Totais t = Totais.de(leituras);
        DoubleSummaryStatistics temperatura = leituras.stream().mapToDouble(Leitura::getTemperatura).summaryStatistics();
        return new IndicadorHora(IndicadorHora.idDe(maquina.getId(), inicio), maquina.getId(), inicio, fonte,
                leituras.size(), t.segundosPlanejados(), t.segundosOperando(), t.segundosParado(), t.paradas(),
                t.pecasProduzidas(), t.pecasBoas(), t.comecaParada(), t.terminaParada(),
                temperatura.getAverage(), temperatura.getMin(), temperatura.getMax());
    }

    private List<Leitura> gravadas(String maquinaId, Instant inicio, Instant fim) {
        return mongoTemplate.find(Query.query(Criteria.where("maquinaId").is(maquinaId)
                .and("instante").gte(inicio).lt(fim)), Leitura.class);
    }

    private Set<String> idsExistentes(String maquinaId, Instant inicio, Instant fim) {
        Query query = Query.query(Criteria.where("maquinaId").is(maquinaId).and("hora").gte(inicio).lt(fim));
        query.fields().include("_id");
        Set<String> ids = new HashSet<>();
        mongoTemplate.find(query, IndicadorHora.class).forEach(h -> ids.add(h.getId()));
        return ids;
    }

    // Sem ordem e ignorando só repetidos: o job da hora pode gravar a mesma hora ao mesmo tempo.
    private int inserirIgnorandoRepetidos(List<IndicadorHora> agregados) {
        if (agregados.isEmpty()) {
            return 0;
        }
        try {
            return mongoTemplate.bulkOps(BulkOperations.BulkMode.UNORDERED, IndicadorHora.class)
                    .insert(agregados).execute().getInsertedCount();
        } catch (BulkOperationException e) {
            if (!e.getErrors().stream().allMatch(erro -> erro.getCode() == CHAVE_REPETIDA)) {
                throw e;
            }
            return e.getResult().getInsertedCount();
        }
    }
}
