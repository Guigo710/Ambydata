package com.ambydata.ambydata_backend.notificacao;

import com.ambydata.ambydata_backend.usuario.Usuario;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// Sino das telas de produção: as notificações do usuário logado.
@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoController {

    private final NotificacaoService servico;

    public NotificacaoController(NotificacaoService servico) {
        this.servico = servico;
    }

    @GetMapping
    public NotificacoesResponse listar(@AuthenticationPrincipal Usuario usuario) {
        return servico.listar(usuario);
    }

    @PostMapping("/{id}/lida")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void marcarLida(@PathVariable String id, @AuthenticationPrincipal Usuario usuario) {
        servico.marcarLida(id, usuario);
    }

    @PostMapping("/lidas")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void marcarTodas(@AuthenticationPrincipal Usuario usuario) {
        servico.marcarTodas(usuario);
    }
}
