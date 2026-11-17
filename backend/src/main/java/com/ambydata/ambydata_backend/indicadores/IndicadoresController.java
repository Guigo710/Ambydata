package com.ambydata.ambydata_backend.indicadores;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

// Indicadores para as telas de produção (OPERARIO, ENGENHEIRO, DIRETOR; ver SecurityConfig).
@RestController
@RequestMapping("/api/indicadores")
public class IndicadoresController {

    private final IndicadoresService servico;
    private final HistoricoService historico;

    public IndicadoresController(IndicadoresService servico, HistoricoService historico) {
        this.servico = servico;
        this.historico = historico;
    }

    @GetMapping("/resumo")
    public List<ResumoMaquina> resumo() {
        return servico.resumo(Instant.now());
    }

    @GetMapping("/maquinas/{id}/agora")
    public AgoraMaquina agora(@PathVariable String id) {
        return servico.agora(id, Instant.now());
    }

    @GetMapping("/maquinas/{id}/historico")
    public Historico historico(@PathVariable String id, @RequestParam(defaultValue = "24") int horas) {
        return historico.historico(id, horas, Instant.now());
    }

    @GetMapping("/comparativo")
    public Comparativo comparativo(@RequestParam(defaultValue = "24h") String periodo,
            @RequestParam(defaultValue = "linha") String por) {
        return historico.comparativo(periodo, por, Instant.now());
    }

    // Só DIRETOR (SecurityConfig).
    @GetMapping("/financeiro")
    public RelatorioFinanceiro financeiro(@RequestParam(defaultValue = "24h") String periodo) {
        return historico.financeiro(periodo, Instant.now());
    }

    @GetMapping("/leituras/{id}")
    public List<PontoLeitura> leituras(@PathVariable String id, @RequestParam(defaultValue = "120") int minutos) {
        return servico.leituras(id, minutos, Instant.now());
    }
}
