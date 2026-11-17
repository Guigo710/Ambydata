package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.config.CampoInvalidoException;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.MaquinaResponse;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

// Histórico, comparativos e financeiro: tudo a partir dos agregados das horas fechadas
// (indicador_hora). A hora corrente fica de fora; ela aparece nas telas "de agora".
@Service
public class HistoricoService {

    public static final int HORAS_MAXIMAS = 7 * 24;
    private static final Duration HORA = Duration.ofHours(1);
    private static final Map<String, Integer> PERIODOS = Map.of("24h", 24, "7d", HORAS_MAXIMAS);
    private static final Map<String, Function<Maquina, String>> AGRUPAMENTOS = Map.of(
            "setor", Maquina::getSetor, "linha", Maquina::getLinha, "maquina", Maquina::getNome);

    private final MongoTemplate mongoTemplate;
    private final MaquinaService maquinas;

    public HistoricoService(MongoTemplate mongoTemplate, MaquinaService maquinas) {
        this.mongoTemplate = mongoTemplate;
        this.maquinas = maquinas;
    }

    public Historico historico(String maquinaId, int horas, Instant agora) {
        if (horas < 1 || horas > HORAS_MAXIMAS) {
            throw new CampoInvalidoException("horas", "Informe de 1 a " + HORAS_MAXIMAS + " horas.");
        }
        Maquina m = maquinas.buscar(maquinaId);
        Instant fim = agora.truncatedTo(ChronoUnit.HOURS);
        Instant inicio = fim.minus(HORA.multipliedBy(horas));
        Map<Instant, IndicadorHora> agregados = agregados(List.of(m.getId()), inicio, fim).stream()
                .collect(Collectors.toMap(IndicadorHora::getHora, Function.identity()));
        List<PontoHistorico> pontos = new ArrayList<>(horas);
        Totais total = Totais.VAZIO;
        for (Instant hora = inicio; hora.isBefore(fim); hora = hora.plus(HORA)) {
            IndicadorHora h = agregados.get(hora);
            if (h == null) {
                pontos.add(new PontoHistorico(hora, true, null, null, null, null, null, null));
                continue;
            }
            pontos.add(new PontoHistorico(hora, false, h.getFonte(), h.totais(),
                    CalculadoraIndicadores.calcular(h.totais(), m.getCadenciaIdeal()),
                    h.getTemperaturaMedia(), h.getTemperaturaMinima(), h.getTemperaturaMaxima()));
            total = total.somar(h.totais());
        }
        return new Historico(MaquinaResponse.de(m), pontos,
                new Periodo(inicio, fim, false, total, CalculadoraIndicadores.calcular(total, m.getCadenciaIdeal())));
    }

    public Comparativo comparativo(String periodo, String por, Instant agora) {
        int horas = horasDo(periodo);
        Function<Maquina, String> grupoDe = AGRUPAMENTOS.get(por);
        if (grupoDe == null) {
            throw new CampoInvalidoException("por", "Use setor, linha ou maquina.");
        }
        Instant fim = agora.truncatedTo(ChronoUnit.HOURS);
        Instant inicio = fim.minus(HORA.multipliedBy(horas));
        Map<Maquina, Totais> porMaquina = totaisPorMaquina(inicio, fim);

        Map<String, List<Maquina>> grupos = new TreeMap<>();
        porMaquina.keySet().forEach(m -> grupos.computeIfAbsent(grupoDe.apply(m), g -> new ArrayList<>()).add(m));
        List<GrupoComparativo> resultado = grupos.entrySet().stream().map(e -> {
            Totais soma = Totais.VAZIO;
            double ideal = 0;
            for (Maquina m : e.getValue()) {
                soma = soma.juntar(porMaquina.get(m));
                ideal += CalculadoraIndicadores.pecasIdeais(porMaquina.get(m), m.getCadenciaIdeal());
            }
            return new GrupoComparativo(e.getKey(), e.getValue().stream().map(Maquina::getNome).sorted().toList(),
                    soma, CalculadoraIndicadores.calcularComIdeal(soma, ideal));
        }).toList();
        return new Comparativo(periodo, por, inicio, fim, resultado);
    }

    public RelatorioFinanceiro financeiro(String periodo, Instant agora) {
        int horas = horasDo(periodo);
        Instant fim = agora.truncatedTo(ChronoUnit.HOURS);
        Instant inicio = fim.minus(HORA.multipliedBy(horas));
        List<FinanceiroMaquina> porMaquina = totaisPorMaquina(inicio, fim).entrySet().stream().map(e -> {
            Maquina m = e.getKey();
            Totais t = e.getValue();
            return new FinanceiroMaquina(m.getId(), m.getNome(), m.getSetor(), m.getLinha(), m.getCustoHora(),
                    m.getValorPorPeca(), t.segundosPlanejados() / 3600.0, t.pecasBoas(),
                    CalculadoraIndicadores.financeiro(t, m.getCustoHora(), m.getValorPorPeca()));
        }).toList();
        Map<String, Financeiro> porLinha = new TreeMap<>();
        porMaquina.forEach(f -> porLinha.merge(f.linha(), f.financeiro(), HistoricoService::somar));
        Financeiro total = porMaquina.stream().map(FinanceiroMaquina::financeiro)
                .reduce(new Financeiro(0, 0, 0), HistoricoService::somar);
        return new RelatorioFinanceiro(periodo, inicio, fim, porMaquina,
                porLinha.entrySet().stream().map(e -> new FinanceiroGrupo(e.getKey(), e.getValue())).toList(), total);
    }

    // Máquinas ativas (na ordem linha, nome) com a soma das suas horas no período, em ordem de hora.
    private Map<Maquina, Totais> totaisPorMaquina(Instant inicio, Instant fim) {
        List<Maquina> ativas = maquinas.listar(true);
        Map<String, List<IndicadorHora>> porMaquina = agregados(ativas.stream().map(Maquina::getId).toList(), inicio, fim)
                .stream().collect(Collectors.groupingBy(IndicadorHora::getMaquinaId));
        Map<Maquina, Totais> totais = new LinkedHashMap<>();
        for (Maquina m : ativas) {
            Totais soma = Totais.VAZIO;
            for (IndicadorHora h : porMaquina.getOrDefault(m.getId(), List.of())) {
                soma = soma.somar(h.totais());
            }
            totais.put(m, soma);
        }
        return totais;
    }

    private List<IndicadorHora> agregados(List<String> maquinaIds, Instant inicio, Instant fim) {
        return mongoTemplate.find(Query.query(Criteria.where("maquinaId").in(maquinaIds).and("hora").gte(inicio).lt(fim))
                .with(Sort.by("hora")), IndicadorHora.class);
    }

    private static int horasDo(String periodo) {
        Integer horas = PERIODOS.get(periodo);
        if (horas == null) {
            throw new CampoInvalidoException("periodo", "Use 24h ou 7d.");
        }
        return horas;
    }

    private static Financeiro somar(Financeiro a, Financeiro b) {
        return new Financeiro(a.custo() + b.custo(), a.receita() + b.receita(), a.lucro() + b.lucro());
    }
}
