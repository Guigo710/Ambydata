package com.ambydata.ambydata_backend.chamado;

import com.ambydata.ambydata_backend.usuario.Usuario;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

// Report de Manutenção. Quem pode cada ação está no SecurityConfig: ver (produção), abrir
// (OPERARIO e ENGENHEIRO), assumir/finalizar/cancelar (ENGENHEIRO).
@RestController
@RequestMapping("/api/chamados")
public class ChamadoController {

    private final ChamadoService servico;

    public ChamadoController(ChamadoService servico) {
        this.servico = servico;
    }

    @GetMapping
    public List<Chamado> listar(@RequestParam(required = false) String status, @RequestParam(required = false) String maquinaId) {
        return servico.listar(status, maquinaId, Instant.now());
    }

    @GetMapping("/{id}")
    public Chamado buscar(@PathVariable String id) {
        return servico.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Chamado abrir(@Valid @RequestBody AbrirChamadoRequest dados, @AuthenticationPrincipal Usuario usuario) {
        return servico.abrir(dados, usuario);
    }

    @PostMapping("/{id}/assumir")
    public Chamado assumir(@PathVariable String id, @AuthenticationPrincipal Usuario usuario) {
        return servico.assumir(id, usuario);
    }

    @PostMapping("/{id}/finalizar")
    public Chamado finalizar(@PathVariable String id, @Valid @RequestBody FinalizarChamadoRequest dados,
            @AuthenticationPrincipal Usuario usuario) {
        return servico.finalizar(id, dados.solucao(), usuario);
    }

    @PostMapping("/{id}/cancelar")
    public Chamado cancelar(@PathVariable String id, @Valid @RequestBody CancelarChamadoRequest dados,
            @AuthenticationPrincipal Usuario usuario) {
        return servico.cancelar(id, dados.motivo(), usuario);
    }
}
