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

    public IndicadoresController(IndicadoresService servico) {
        this.servico = servico;
    }

    @GetMapping("/resumo")
    public List<ResumoMaquina> resumo() {
        return servico.resumo(Instant.now());
    }

    @GetMapping("/maquinas/{id}/agora")
    public AgoraMaquina agora(@PathVariable String id) {
        return servico.agora(id, Instant.now());
    }

    @GetMapping("/leituras/{id}")
    public List<PontoLeitura> leituras(@PathVariable String id, @RequestParam(defaultValue = "120") int minutos) {
        return servico.leituras(id, minutos, Instant.now());
    }
}
