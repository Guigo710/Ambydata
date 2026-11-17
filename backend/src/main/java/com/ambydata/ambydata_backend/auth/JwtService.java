package com.ambydata.ambydata_backend.auth;

import com.ambydata.ambydata_backend.usuario.Usuario;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

// Emite e valida os tokens de sessão (JWT HS256). O token carrega só o id do usuário
// (sub) e o perfil; quem usa o token sempre recarrega o usuário do banco.
@Service
public class JwtService {

    private final SecretKey chave;
    private final Duration validade;
    private final Clock relogio;

    @Autowired
    public JwtService(JwtProperties propriedades) {
        this(propriedades, Clock.systemUTC());
    }

    JwtService(JwtProperties propriedades, Clock relogio) {
        this.chave = Keys.hmacShaKeyFor(propriedades.secret().getBytes(StandardCharsets.UTF_8));
        this.validade = Duration.ofHours(propriedades.expiracaoHoras());
        this.relogio = relogio;
    }

    public TokenEmitido emitir(Usuario usuario) {
        Instant agora = relogio.instant();
        Instant expiraEm = agora.plus(validade);
        String token = Jwts.builder()
                .subject(usuario.getId())
                .claim("perfil", usuario.getPerfil().name())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(expiraEm))
                .signWith(chave, Jwts.SIG.HS256)
                .compact();
        return new TokenEmitido(token, expiraEm);
    }

    // Devolve o id do usuário se o token for íntegro e não estiver expirado.
    public Optional<String> validar(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            String usuarioId = Jwts.parser()
                    .verifyWith(chave)
                    .clock(() -> Date.from(relogio.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getSubject();
            return Optional.ofNullable(usuarioId);
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
