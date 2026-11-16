package com.ambydata.ambydata_backend.usuario;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Gestão de usuários. Acesso restrito ao perfil ADMIN no SecurityConfig.
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioAdminController {

    private final UsuarioService usuarioService;

    public UsuarioAdminController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public List<UsuarioResponse> listar() {
        return usuarioService.listar().stream().map(UsuarioResponse::de).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponse criar(@Valid @RequestBody CriarUsuarioRequest request) {
        return UsuarioResponse.de(usuarioService.criar(request));
    }

    @PutMapping("/{id}")
    public UsuarioResponse atualizar(@PathVariable String id, @Valid @RequestBody AtualizarUsuarioRequest request) {
        return UsuarioResponse.de(usuarioService.atualizar(id, request));
    }

    @PatchMapping("/{id}/ativo")
    public UsuarioResponse alterarAtivo(@PathVariable String id, @Valid @RequestBody AlterarAtivoRequest request,
            @AuthenticationPrincipal Usuario solicitante) {
        return UsuarioResponse.de(usuarioService.alterarAtivo(id, request.ativo(), solicitante));
    }

    @PutMapping("/{id}/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void redefinirSenha(@PathVariable String id, @Valid @RequestBody RedefinirSenhaRequest request) {
        usuarioService.redefinirSenha(id, request.novaSenha());
    }
}
