package com.ambydata.ambydata_backend.auth;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.usuario.Perfil;
import com.ambydata.ambydata_backend.usuario.Usuario;
import com.ambydata.ambydata_backend.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class TrocaSenhaTests {

    private static final String SENHA_ATUAL = "senha-atual-123";
    private static final String SENHA_NOVA = "senha-nova-456";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UsuarioRepository repositorio;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtService jwtService;

    private String token;

    @BeforeEach
    void preparar() {
        repositorio.deleteAll();
        Usuario operario = repositorio.save(new Usuario(null, "Op. Bia", "bia@ambydata.demo",
                encoder.encode(SENHA_ATUAL), Perfil.OPERARIO, true));
        token = jwtService.emitir(operario).token();
    }

    @Test
    void trocaASenhaEASenhaAntigaDeixaDeFuncionar() throws Exception {
        mvc.perform(trocarSenha(token, SENHA_ATUAL, SENHA_NOVA))
                .andExpect(status().isNoContent());

        mvc.perform(login(SENHA_ATUAL)).andExpect(status().isUnauthorized());
        mvc.perform(login(SENHA_NOVA)).andExpect(status().isOk());
    }

    @Test
    void senhaAtualErradaDevolve400ENaoTroca() throws Exception {
        mvc.perform(trocarSenha(token, "errada-errada", SENHA_NOVA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Senha atual incorreta."));

        mvc.perform(login(SENHA_ATUAL)).andExpect(status().isOk());
    }

    @Test
    void novaSenhaCurtaDevolveErroNoCampo() throws Exception {
        mvc.perform(trocarSenha(token, SENHA_ATUAL, "curta"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.novaSenha").isNotEmpty());
    }

    @Test
    void semTokenDevolve401() throws Exception {
        mvc.perform(put("/api/auth/me/senha").contentType(MediaType.APPLICATION_JSON)
                        .content(corpo(SENHA_ATUAL, SENHA_NOVA)))
                .andExpect(status().isUnauthorized());
    }

    private static RequestBuilder trocarSenha(String token, String atual, String nova) {
        return put("/api/auth/me/senha")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo(atual, nova));
    }

    private static RequestBuilder login(String senha) {
        return post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"bia@ambydata.demo\",\"senha\":\"" + senha + "\"}");
    }

    private static String corpo(String atual, String nova) {
        return "{\"senhaAtual\":\"" + atual + "\",\"novaSenha\":\"" + nova + "\"}";
    }
}
