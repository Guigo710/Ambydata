package com.ambydata.ambydata_backend.auth;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.usuario.Perfil;
import com.ambydata.ambydata_backend.usuario.Usuario;
import com.ambydata.ambydata_backend.usuario.UsuarioRepository;
import com.jayway.jsonpath.JsonPath;
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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthTests {

    private static final String SENHA = "senha-correta-123";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UsuarioRepository repositorio;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtService jwtService;

    private Usuario engenheiro;

    @BeforeEach
    void preparar() {
        repositorio.deleteAll();
        engenheiro = repositorio.save(new Usuario(null, "Eng. Ana", "ana@ambydata.demo",
                encoder.encode(SENHA), Perfil.ENGENHEIRO, true));
        repositorio.save(new Usuario(null, "Inativo", "inativo@ambydata.demo",
                encoder.encode(SENHA), Perfil.OPERARIO, false));
    }

    @Test
    void loginValidoDevolveTokenEUsuarioSemHash() throws Exception {
        mvc.perform(login("ANA@ambydata.demo ", SENHA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.expiraEm").isNotEmpty())
                .andExpect(jsonPath("$.usuario.id").value(engenheiro.getId()))
                .andExpect(jsonPath("$.usuario.perfil").value("ENGENHEIRO"))
                .andExpect(jsonPath("$.usuario.ativo").value(true))
                .andExpect(content().string(not(containsString("senhaHash"))))
                .andExpect(content().string(not(containsString("$2a$"))));
    }

    @Test
    void senhaErradaEUsuarioInativoRecebemAMesmaMensagem() throws Exception {
        mvc.perform(login("ana@ambydata.demo", "errada"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.erro").value("E-mail ou senha incorretos."));
        mvc.perform(login("inativo@ambydata.demo", SENHA))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("E-mail ou senha incorretos."));
        mvc.perform(login("ninguem@ambydata.demo", SENHA))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("E-mail ou senha incorretos."));
    }

    @Test
    void loginSemEmailDevolveErroDeValidacaoPorCampo() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\",\"senha\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.erro").isNotEmpty())
                .andExpect(jsonPath("$.campos.email").isNotEmpty());
    }

    @Test
    void corpoInvalidoDevolve400() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{nao-e-json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void meComTokenValidoDevolveOUsuario() throws Exception {
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDaAna()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ana@ambydata.demo"))
                .andExpect(jsonPath("$.perfil").value("ENGENHEIRO"));
    }

    @Test
    void semTokenOuComTokenInvalidoDevolve401NoFormatoPadrao() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.erro").isNotEmpty());
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer lixo"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void usuarioDesativadoDepoisDoLoginPerdeOAcessoNaHora() throws Exception {
        String token = tokenDaAna();
        engenheiro.setAtivo(false);
        repositorio.save(engenheiro);

        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void mudancaDePerfilValeSemNovoLogin() throws Exception {
        String token = tokenDaAna();
        engenheiro.setPerfil(Perfil.DIRETOR);
        repositorio.save(engenheiro);

        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("DIRETOR"));
    }

    @Test
    void rotaSemRegraENegada() throws Exception {
        mvc.perform(get("/api/qualquer-coisa"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/qualquer-coisa").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDaAna()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void rotaAntigaDeLoginNaoExisteMais() throws Exception {
        mvc.perform(post("/api/usuarios/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@ambydata.demo\",\"senha\":\"" + SENHA + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void corsLiberaSoAsOrigensConfiguradas() throws Exception {
        mvc.perform(options("/api/auth/login")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
        mvc.perform(options("/api/auth/login")
                        .header(HttpHeaders.ORIGIN, "https://site-malicioso.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden());
    }

    @Test
    void tokenDoLoginFuncionaNoMe() throws Exception {
        String resposta = mvc.perform(login("ana@ambydata.demo", SENHA))
                .andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(resposta, "$.token");

        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
    }

    private String tokenDaAna() {
        return jwtService.emitir(engenheiro).token();
    }

    private static org.springframework.test.web.servlet.RequestBuilder login(String email, String senha) {
        return post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"senha\":\"" + senha + "\"}");
    }
}
