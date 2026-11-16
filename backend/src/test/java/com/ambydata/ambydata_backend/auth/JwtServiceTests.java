package com.ambydata.ambydata_backend.auth;

import com.ambydata.ambydata_backend.usuario.Perfil;
import com.ambydata.ambydata_backend.usuario.Usuario;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTests {

    private static final String SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres";
    private static final Instant AGORA = Instant.parse("2026-11-16T12:00:00Z");

    private final JwtService servico = new JwtService(new JwtProperties(SEGREDO, 8), relogioEm(AGORA));

    @Test
    void tokenEmitidoValeParaOUsuarioEExpiraNoTempoConfigurado() {
        TokenEmitido emitido = servico.emitir(usuario("u1", Perfil.ENGENHEIRO));

        assertThat(emitido.expiraEm()).isEqualTo(AGORA.plus(Duration.ofHours(8)));
        assertThat(servico.validar(emitido.token())).contains("u1");
    }

    @Test
    void tokenExpiradoERecusado() {
        JwtService noPassado = new JwtService(new JwtProperties(SEGREDO, 8), relogioEm(AGORA.minus(Duration.ofHours(9))));
        String token = noPassado.emitir(usuario("u1", Perfil.OPERARIO)).token();

        assertThat(servico.validar(token)).isEmpty();
    }

    @Test
    void tokenAdulteradoERecusado() {
        String token = servico.emitir(usuario("u1", Perfil.OPERARIO)).token();
        String[] partes = token.split("\\.");
        String adulterado = partes[0] + "." + partes[1] + "x." + partes[2];

        assertThat(servico.validar(adulterado)).isEmpty();
    }

    @Test
    void tokenAssinadoComOutroSegredoERecusado() {
        JwtService outro = new JwtService(new JwtProperties("outro-segredo-tambem-com-32-caracteres!", 8), relogioEm(AGORA));
        String token = outro.emitir(usuario("u1", Perfil.ADMIN)).token();

        assertThat(servico.validar(token)).isEmpty();
    }

    @Test
    void lixoNaoEToken() {
        assertThat(servico.validar("nao-e-um-jwt")).isEmpty();
        assertThat(servico.validar("")).isEmpty();
        assertThat(servico.validar(null)).isEmpty();
    }

    private static Usuario usuario(String id, Perfil perfil) {
        return new Usuario(id, "Fulano", "fulano@x.com", "hash", perfil, true);
    }

    private static Clock relogioEm(Instant instante) {
        return Clock.fixed(instante, ZoneOffset.UTC);
    }
}
