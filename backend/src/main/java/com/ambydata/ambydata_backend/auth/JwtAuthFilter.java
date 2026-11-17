package com.ambydata.ambydata_backend.auth;

import com.ambydata.ambydata_backend.usuario.Usuario;
import com.ambydata.ambydata_backend.usuario.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

// Autentica a requisição pelo header "Authorization: Bearer <token>". O usuário é
// recarregado do banco a cada requisição: desativar alguém ou mudar o perfil vale
// na hora, sem esperar o token expirar. Sem token válido, a requisição segue anônima
// e o SecurityConfig decide se ela pode passar.
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String PREFIXO = "Bearer ";

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;

    public JwtAuthFilter(JwtService jwtService, UsuarioRepository usuarioRepository) {
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(PREFIXO)) {
            jwtService.validar(header.substring(PREFIXO.length()))
                    .flatMap(usuarioRepository::findById)
                    .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                    .ifPresent(JwtAuthFilter::autenticar);
        }
        chain.doFilter(request, response);
    }

    private static void autenticar(Usuario usuario) {
        var autoridades = List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getPerfil().name()));
        var autenticacao = new UsernamePasswordAuthenticationToken(usuario, null, autoridades);
        SecurityContextHolder.getContext().setAuthentication(autenticacao);
    }
}
