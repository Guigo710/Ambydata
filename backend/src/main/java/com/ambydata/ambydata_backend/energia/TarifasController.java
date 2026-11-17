package com.ambydata.ambydata_backend.energia;

import com.ambydata.ambydata_backend.usuario.Usuario;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Tarifas de energia: ENGENHEIRO e DIRETOR veem, só o ENGENHEIRO altera (SecurityConfig).
@RestController
@RequestMapping("/api/energia/tarifas")
public class TarifasController {

    private final TarifasService servico;

    public TarifasController(TarifasService servico) {
        this.servico = servico;
    }

    @GetMapping
    public TarifasEnergia obter() {
        return servico.obter();
    }

    @PutMapping
    public TarifasEnergia atualizar(@Valid @RequestBody TarifasRequest dados, @AuthenticationPrincipal Usuario usuario) {
        return servico.atualizar(dados, usuario.getNome());
    }
}
