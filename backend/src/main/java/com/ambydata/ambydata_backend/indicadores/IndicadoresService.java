package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.config.CampoInvalidoException;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.MaquinaResponse;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import com.ambydata.ambydata_backend.simulacao.GeradorLeituras;
import com.ambydata.ambydata_backend.simulacao.Leitura;
import com.ambydata.ambydata_backend.simulacao.SimulacaoProperties;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// Indicadores "de agora": a última hora sai das leituras brutas; o turno soma os agregados das
// horas fechadas (indicador_hora) com as leituras da hora corrente.
@Service
public class IndicadoresService {

    public static final int MINUTOS_MAXIMOS_DO_GRAFICO = 360;
    private static final Duration HORA = Duration.ofHours(1);

    private final MongoTemplate mongoTemplate;
    private final MaquinaService maquinas;
    private final ZoneId fuso;

    public IndicadoresService(MongoTemplate mongoTemplate, MaquinaService maquinas, SimulacaoProperties simulacao) {
        this.mongoTemplate = mongoTemplate;
        this.maquinas = maquinas;
        this.fuso = ZoneId.of(simulacao.fuso());
    }

    public List<ResumoMaquina> resumo(Instant agora) {
        List<Maquina> ativas = maquinas.listar(true);
        Map<String, List<Leitura>> porMaquina = mongoTemplate.find(Query.query(Criteria.where("maquinaId")
                        .in(ativas.stream().map(Maquina::getId).toList())
                        .and("instante").gt(agora.minus(HORA)).lte(agora)), Leitura.class)
                .stream().collect(Collectors.groupingBy(Leitura::getMaquinaId));
        return ativas.stream().map(m -> {
            List<Leitura> daHora = porMaquina.getOrDefault(m.getId(), List.of());
            Leitura ultima = daHora.stream().max(Comparator.comparing(Leitura::getInstante)).orElse(null);
            return new ResumoMaquina(MaquinaResponse.publica(m), ultimaLeitura(m, ultima),
                    periodo(m, agora.minus(HORA), agora, true, Totais.de(daHora)));
        }).toList();
    }

    public AgoraMaquina agora(String maquinaId, Instant agora) {
        Maquina m = maquinas.buscar(maquinaId);
        List<Leitura> daHora = brutas(m.getId(), agora.minus(HORA), agora);
        Leitura ultima = mongoTemplate.findOne(Query.query(Criteria.where("maquinaId").is(m.getId())
                .and("instante").lte(agora)).with(Sort.by(Sort.Direction.DESC, "instante")), Leitura.class);
        JanelaTurno turno = JanelaTurno.atualOuUltimo(m.getTurnoPlanejado(), agora, fuso);
        return new AgoraMaquina(MaquinaResponse.publica(m), ultimaLeitura(m, ultima),
                periodo(m, agora.minus(HORA), agora, true, Totais.de(daHora)),
                periodo(m, turno.inicio(), turno.fim(), turno.emAndamento(), totaisDoTurno(m, turno, agora)),
                GeradorLeituras.SEGUNDOS_POR_BLOCO);
    }

    public List<PontoLeitura> leituras(String maquinaId, int minutos, Instant agora) {
        if (minutos < 1 || minutos > MINUTOS_MAXIMOS_DO_GRAFICO) {
            throw new CampoInvalidoException("minutos", "Informe de 1 a " + MINUTOS_MAXIMOS_DO_GRAFICO + " minutos.");
        }
        Maquina m = maquinas.buscar(maquinaId);
        return brutas(m.getId(), agora.minus(Duration.ofMinutes(minutos)), agora).stream()
                .sorted(Comparator.comparing(Leitura::getInstante))
                .map(l -> new PontoLeitura(l.getInstante(), l.getStatus(), l.getTemperatura(), l.getPecasProduzidas(), l.getPecasBoas()))
                .toList();
    }

    // Horas fechadas: agregado (ou, se o job ainda não gravou, as leituras da hora).
    // Hora corrente: leituras até agora. Leituras fora do turno não contam em nenhum caso.
    private Totais totaisDoTurno(Maquina m, JanelaTurno turno, Instant agora) {
        Instant primeira = turno.inicio().truncatedTo(ChronoUnit.HOURS);
        Instant horaCorrente = agora.truncatedTo(ChronoUnit.HOURS);
        Map<Instant, IndicadorHora> agregados = mongoTemplate.find(Query.query(Criteria.where("maquinaId").is(m.getId())
                        .and("hora").gte(primeira).lt(turno.fim())), IndicadorHora.class)
                .stream().collect(Collectors.toMap(IndicadorHora::getHora, Function.identity()));

        List<Instant> horas = new ArrayList<>();
        for (Instant hora = primeira; hora.isBefore(turno.fim()); hora = hora.plus(HORA)) {
            horas.add(hora);
        }
        // Horas sem agregado (a corrente e as que o job ainda não gravou) numa consulta só.
        List<Instant> semAgregado = horas.stream()
                .filter(h -> !h.isBefore(horaCorrente) || !agregados.containsKey(h)).toList();
        Map<Instant, List<Leitura>> brutasPorHora = semAgregado.isEmpty() ? Map.of()
                : mongoTemplate.find(Query.query(Criteria.where("maquinaId").is(m.getId())
                                .and("instante").gte(semAgregado.getFirst()).lte(agora)), Leitura.class)
                        .stream().collect(Collectors.groupingBy(l -> l.getInstante().truncatedTo(ChronoUnit.HOURS)));

        Totais soma = Totais.VAZIO;
        for (Instant hora : horas) {
            Totais daHora = semAgregado.contains(hora)
                    ? Totais.de(brutasPorHora.getOrDefault(hora, List.of()))
                    : agregados.get(hora).totais();
            soma = soma.somar(daHora);
        }
        return soma;
    }

    // Leituras em (de, ate].
    private List<Leitura> brutas(String maquinaId, Instant de, Instant ate) {
        return mongoTemplate.find(Query.query(Criteria.where("maquinaId").is(maquinaId).and("instante").gt(de).lte(ate)),
                Leitura.class);
    }

    private static Periodo periodo(Maquina m, Instant inicio, Instant fim, boolean emAndamento, Totais totais) {
        return new Periodo(inicio, fim, emAndamento, totais, CalculadoraIndicadores.calcular(totais, m.getCadenciaIdeal()));
    }

    private static UltimaLeitura ultimaLeitura(Maquina m, Leitura l) {
        if (l == null) {
            return null;
        }
        return new UltimaLeitura(l.getInstante(), l.getStatus(), l.getTemperatura(), l.getOrigem(),
                SituacaoTemperatura.de(l.getTemperatura(), m.getFaixaTemperatura(), m.getAlertas().percentualCritico()));
    }
}
