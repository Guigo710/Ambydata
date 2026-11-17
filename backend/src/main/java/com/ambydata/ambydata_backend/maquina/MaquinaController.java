package com.ambydata.ambydata_backend.maquina;

import com.ambydata.ambydata_backend.usuario.Perfil;
import com.ambydata.ambydata_backend.usuario.Usuario;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
import java.util.function.Function;

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

    // OPERARIO recebe a máquina sem os dados de gestão (MaquinaResponse.publica).
    private static Function<Maquina, MaquinaResponse> paraQuem(Usuario usuario) {
        return usuario.getPerfil() == Perfil.OPERARIO ? MaquinaResponse::publica : MaquinaResponse::de;
    }

    @GetMapping
    public List<MaquinaResponse> listar(@RequestParam(defaultValue = "false") boolean ativas,
            @AuthenticationPrincipal Usuario usuario) {
        return servico.listar(ativas).stream().map(paraQuem(usuario)).toList();
    }

    @GetMapping("/{id}")
    public MaquinaResponse buscar(@PathVariable String id, @AuthenticationPrincipal Usuario usuario) {
        return paraQuem(usuario).apply(servico.buscar(id));
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
