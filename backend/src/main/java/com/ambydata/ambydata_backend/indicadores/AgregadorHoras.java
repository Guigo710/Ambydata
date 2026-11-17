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
import java.util.Set;

// Monta o agregado de cada hora fechada. Regra (SPEC-simulacao e plano do PR 2):
// hora com leitura de dispositivo → só as leituras gravadas; senão, com o simulador ligado,
// o gerador recalcula a hora (determinístico: dá o mesmo que teria sido gravado, mesmo se o
// backend estava dormindo); senão fica como lacuna. Nada antes de `emOperacaoDesde`.
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
        return agregar(maquina, inicio, !horasComDispositivo(maquina.getId(), inicio, inicio.plus(HORA)).isEmpty());
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
            Set<Instant> comDispositivo = horasComDispositivo(maquina.getId(), inicio, fim);
            List<IndicadorHora> faltando = new ArrayList<>();
            for (Instant hora = inicio; hora.isBefore(fim); hora = hora.plus(HORA)) {
                if (!existentes.contains(IndicadorHora.idDe(maquina.getId(), hora))) {
                    IndicadorHora agregado = agregar(maquina, hora, comDispositivo.contains(hora));
                    if (agregado != null) {
                        faltando.add(agregado);
                    }
                }
            }
            criados += inserirIgnorandoRepetidos(faltando);
        }
        return criados;
    }

    private IndicadorHora agregar(Maquina maquina, Instant inicio, boolean comDispositivo) {
        if (maquina.getEmOperacaoDesde() != null && inicio.isBefore(maquina.getEmOperacaoDesde())) {
            return null;
        }
        List<Leitura> leituras;
        FonteAgregado fonte;
        if (comDispositivo) {
            leituras = mongoTemplate.find(Query.query(Criteria.where("maquinaId").is(maquina.getId())
                    .and("instante").gte(inicio).lt(inicio.plus(HORA))), Leitura.class);
            fonte = FonteAgregado.LEITURAS;
        } else if (simulacao.ativo()) {
            leituras = new ArrayList<>(360);
            for (Instant t = inicio; t.isBefore(inicio.plus(HORA)); t = t.plusSeconds(GeradorLeituras.SEGUNDOS_POR_BLOCO)) {
                leituras.add(gerador.gerar(maquina, t));
            }
            fonte = FonteAgregado.GERADOR;
        } else {
            return null;
        }
        Totais t = Totais.de(leituras);
        DoubleSummaryStatistics temperatura = leituras.stream().mapToDouble(Leitura::getTemperatura).summaryStatistics();
        return new IndicadorHora(IndicadorHora.idDe(maquina.getId(), inicio), maquina.getId(), inicio, fonte,
                leituras.size(), t.segundosPlanejados(), t.segundosOperando(), t.segundosParado(), t.paradas(),
                t.pecasProduzidas(), t.pecasBoas(), t.comecaParada(), t.terminaParada(),
                temperatura.getAverage(), temperatura.getMin(), temperatura.getMax());
    }

    // Horas (início) em que houve leitura de dispositivo; leituras só existem nas últimas 48 h.
    private Set<Instant> horasComDispositivo(String maquinaId, Instant inicio, Instant fim) {
        Query query = Query.query(Criteria.where("maquinaId").is(maquinaId).and("origem").is(OrigemLeitura.DISPOSITIVO)
                .and("instante").gte(inicio).lt(fim));
        query.fields().include("instante");
        Set<Instant> horas = new HashSet<>();
        mongoTemplate.find(query, Leitura.class).forEach(l -> horas.add(l.getInstante().truncatedTo(ChronoUnit.HOURS)));
        return horas;
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
