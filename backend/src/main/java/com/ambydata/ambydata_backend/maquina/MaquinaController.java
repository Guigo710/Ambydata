package com.ambydata.ambydata_backend.maquina;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Leitura para os perfis de produção; alterações só para o ENGENHEIRO (SecurityConfig).
@RestController
@RequestMapping("/api/maquinas")
public class MaquinaController {

    public record AlterarAtivaRequest(@NotNull Boolean ativa) {
    }

    private final MaquinaService servico;

    public MaquinaController(MaquinaService servico) {
        this.servico = servico;
    }

    @GetMapping
    public List<MaquinaResponse> listar(@RequestParam(defaultValue = "false") boolean ativas) {
        return servico.listar(ativas).stream().map(MaquinaResponse::de).toList();
    }

    @GetMapping("/{id}")
    public MaquinaResponse buscar(@PathVariable String id) {
        return MaquinaResponse.de(servico.buscar(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MaquinaResponse criar(@Valid @RequestBody MaquinaRequest dados) {
        return MaquinaResponse.de(servico.criar(dados));
    }

    @PutMapping("/{id}")
    public MaquinaResponse atualizar(@PathVariable String id, @Valid @RequestBody MaquinaRequest dados) {
        return MaquinaResponse.de(servico.atualizar(id, dados));
    }

    @PatchMapping("/{id}/ativa")
    public MaquinaResponse alterarAtiva(@PathVariable String id, @Valid @RequestBody AlterarAtivaRequest dados) {
        return MaquinaResponse.de(servico.alterarAtiva(id, dados.ativa()));
    }
}
