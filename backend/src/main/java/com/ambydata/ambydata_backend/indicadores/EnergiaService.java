package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.energia.BalancoEnergia;
import com.ambydata.ambydata_backend.energia.CalculadoraEnergia;
import com.ambydata.ambydata_backend.energia.SomaEnergia;
import com.ambydata.ambydata_backend.energia.TarifasEnergia;
import com.ambydata.ambydata_backend.energia.TarifasService;
import com.ambydata.ambydata_backend.maquina.Maquina;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

// Custo de energia das horas fechadas do período: tempo operando de cada máquina (agregados
// por hora) × potência, com as tarifas atuais da fábrica. Informativo: não entra no lucro.
@Service
public class EnergiaService {

    private final HistoricoService historico;
    private final TarifasService tarifas;

    public EnergiaService(HistoricoService historico, TarifasService tarifas) {
        this.historico = historico;
        this.tarifas = tarifas;
    }

    public RelatorioEnergia relatorio(String periodo, Instant agora) {
        int horas = HistoricoService.horasDo(periodo);
        Instant fim = agora.truncatedTo(ChronoUnit.HOURS);
        Instant inicio = fim.minus(Duration.ofHours(horas));
        TarifasEnergia tarifasAtuais = tarifas.obter();

        List<EnergiaMaquina> maquinas = historico.totaisPorMaquina(inicio, fim).entrySet().stream().map(e -> {
            Maquina m = e.getKey();
            BalancoEnergia balanco = m.getEnergia() == null ? null
                    : CalculadoraEnergia.calcular(e.getValue().segundosOperando(), m.getEnergia(), tarifasAtuais);
            return new EnergiaMaquina(m.getId(), m.getNome(), m.getSetor(), m.getLinha(), balanco == null, m.getEnergia(), balanco);
        }).toList();

        Map<String, SomaEnergia> porLinha = new TreeMap<>();
        SomaEnergia fabrica = SomaEnergia.ZERO;
        for (EnergiaMaquina m : maquinas) {
            porLinha.putIfAbsent(m.linha(), SomaEnergia.ZERO);
            if (m.balanco() != null) {
                porLinha.put(m.linha(), porLinha.get(m.linha()).mais(m.balanco()));
                fabrica = fabrica.mais(m.balanco());
            }
        }
        double encargos = CalculadoraEnergia.encargosDemanda(tarifasAtuais, horas);
        return new RelatorioEnergia(periodo, inicio, fim, tarifasAtuais, maquinas,
                porLinha.entrySet().stream().map(e -> new EnergiaLinha(e.getKey(), e.getValue())).toList(),
                new TotalEnergia(fabrica, horas, encargos, fabrica.custoLiquido() + encargos));
    }
}
