package com.ambydata.ambydata_backend.auth;

import com.ambydata.ambydata_backend.usuario.Usuario;
import com.ambydata.ambydata_backend.usuario.UsuarioResponse;
import com.ambydata.ambydata_backend.usuario.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;
    private final JwtService jwtService;

    public AuthController(UsuarioService usuarioService, JwtService jwtService) {
        this.usuarioService = usuarioService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        Usuario usuario = usuarioService.autenticar(request.email(), request.senha())
                .orElseThrow(CredenciaisInvalidasException::new);
        TokenEmitido emitido = jwtService.emitir(usuario);
        return new LoginResponse(emitido.token(), emitido.expiraEm(), UsuarioResponse.de(usuario));
    }

    @GetMapping("/me")
    public UsuarioResponse me(@AuthenticationPrincipal Usuario usuario) {
        return UsuarioResponse.de(usuario);
    }
}
