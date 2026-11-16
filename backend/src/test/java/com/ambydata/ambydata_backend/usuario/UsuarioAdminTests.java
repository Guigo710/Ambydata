package com.ambydata.ambydata_backend.usuario;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.auth.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class UsuarioAdminTests {

    private static final String SENHA = "senha-inicial-123";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UsuarioRepository repositorio;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtService jwtService;

    private Usuario admin;
    private Usuario operario;

    @BeforeEach
    void preparar() {
        repositorio.deleteAll();
        admin = criar("Admin", "admin@ambydata.demo", Perfil.ADMIN);
        operario = criar("Op. Caio", "caio@ambydata.demo", Perfil.OPERARIO);
        criar("Eng. Ana", "ana@ambydata.demo", Perfil.ENGENHEIRO);
        criar("Dir. Rui", "rui@ambydata.demo", Perfil.DIRETOR);
    }

    // ---- Permissões: só o ADMIN acessa /api/usuarios ----

    @ParameterizedTest
    @EnumSource(value = Perfil.class, names = {"OPERARIO", "ENGENHEIRO", "DIRETOR"})
    void perfisSemPermissaoRecebem403EmTodasAsRotas(Perfil perfil) throws Exception {
        String token = tokenDe(repositorio.findAll().stream().filter(u -> u.getPerfil() == perfil).findFirst().orElseThrow());
        for (MockHttpServletRequestBuilder requisicao : todasAsRotas()) {
            mvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void adminAcessaTodasAsRotas() throws Exception {
        String token = tokenDe(admin);
        for (MockHttpServletRequestBuilder requisicao : todasAsRotas()) {
            mvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().is2xxSuccessful());
        }
    }

    @Test
    void semTokenRecebe401() throws Exception {
        mvc.perform(get("/api/usuarios")).andExpect(status().isUnauthorized());
    }

    // ---- Listagem e criação ----

    @Test
    void listaTodosOrdenadosPorNomeSemHash() throws Exception {
        mvc.perform(comoAdmin(get("/api/usuarios")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].nome").value("Admin"))
                .andExpect(jsonPath("$[1].nome").value("Dir. Rui"))
                .andExpect(content().string(not(containsString("senhaHash"))));
    }

    @Test
    void criaUsuarioQueConsegueEntrar() throws Exception {
        mvc.perform(comoAdmin(post("/api/usuarios")).contentType(MediaType.APPLICATION_JSON)
                        .content(novoUsuario("Nova Pessoa", "NOVA@ambydata.demo", "senha-da-nova", "ENGENHEIRO")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.email").value("nova@ambydata.demo"))
                .andExpect(jsonPath("$.perfil").value("ENGENHEIRO"))
                .andExpect(jsonPath("$.ativo").value(true))
                .andExpect(content().string(not(containsString("senha"))));

        mvc.perform(login("nova@ambydata.demo", "senha-da-nova")).andExpect(status().isOk());
    }

    @Test
    void emailDuplicadoDevolve400NoCampo() throws Exception {
        mvc.perform(comoAdmin(post("/api/usuarios")).contentType(MediaType.APPLICATION_JSON)
                        .content(novoUsuario("Outro", "Caio@ambydata.demo", "senha-qualquer", "OPERARIO")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("E-mail já cadastrado."))
                .andExpect(jsonPath("$.campos.email").isNotEmpty());
    }

    @Test
    void criacaoValidaOsCampos() throws Exception {
        mvc.perform(comoAdmin(post("/api/usuarios")).contentType(MediaType.APPLICATION_JSON)
                        .content(novoUsuario("", "nao-e-email", "curta", "OPERARIO")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nome").isNotEmpty())
                .andExpect(jsonPath("$.campos.email").isNotEmpty())
                .andExpect(jsonPath("$.campos.senha").isNotEmpty());
        mvc.perform(comoAdmin(post("/api/usuarios")).contentType(MediaType.APPLICATION_JSON)
                        .content(novoUsuario("X", "x@ambydata.demo", "senha-valida", "CHEFE")))
                .andExpect(status().isBadRequest());
    }

    // ---- Edição ----

    @Test
    void editaNomeEmailEPerfil() throws Exception {
        mvc.perform(comoAdmin(put("/api/usuarios/" + operario.getId())).contentType(MediaType.APPLICATION_JSON)
                        .content(edicao("Caio Souza", "caio.souza@ambydata.demo", "ENGENHEIRO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Caio Souza"))
                .andExpect(jsonPath("$.email").value("caio.souza@ambydata.demo"))
                .andExpect(jsonPath("$.perfil").value("ENGENHEIRO"));
    }

    @Test
    void edicaoComEmailDeOutroUsuarioDevolve400() throws Exception {
        mvc.perform(comoAdmin(put("/api/usuarios/" + operario.getId())).contentType(MediaType.APPLICATION_JSON)
                        .content(edicao("Caio", "ana@ambydata.demo", "OPERARIO")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.email").isNotEmpty());
    }

    @Test
    void usuarioInexistenteDevolve404() throws Exception {
        mvc.perform(comoAdmin(put("/api/usuarios/nao-existe")).contentType(MediaType.APPLICATION_JSON)
                        .content(edicao("X", "x@ambydata.demo", "OPERARIO")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void naoRebaixaOUltimoAdmin() throws Exception {
        mvc.perform(comoAdmin(put("/api/usuarios/" + admin.getId())).contentType(MediaType.APPLICATION_JSON)
                        .content(edicao("Admin", "admin@ambydata.demo", "DIRETOR")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void rebaixaUmAdminQuandoExisteOutro() throws Exception {
        Usuario segundo = criar("Admin 2", "admin2@ambydata.demo", Perfil.ADMIN);
        mvc.perform(comoAdmin(put("/api/usuarios/" + segundo.getId())).contentType(MediaType.APPLICATION_JSON)
                        .content(edicao("Admin 2", "admin2@ambydata.demo", "DIRETOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("DIRETOR"));
    }

    // ---- Ativar / desativar ----

    @Test
    void desativaOutroUsuarioQuePerdeOAcesso() throws Exception {
        String tokenDoOperario = tokenDe(operario);
        mvc.perform(comoAdmin(patch("/api/usuarios/" + operario.getId() + "/ativo"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ativo\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(false));

        mvc.perform(login("caio@ambydata.demo", SENHA)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDoOperario))
                .andExpect(status().isUnauthorized());

        mvc.perform(comoAdmin(patch("/api/usuarios/" + operario.getId() + "/ativo"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ativo\":true}"))
                .andExpect(status().isOk());
        mvc.perform(login("caio@ambydata.demo", SENHA)).andExpect(status().isOk());
    }

    @Test
    void adminNaoDesativaASiMesmo() throws Exception {
        criar("Admin 2", "admin2@ambydata.demo", Perfil.ADMIN);
        mvc.perform(comoAdmin(patch("/api/usuarios/" + admin.getId() + "/ativo"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ativo\":false}"))
                .andExpect(status().isConflict());
    }

    @Test
    void ativoObrigatorio() throws Exception {
        mvc.perform(comoAdmin(patch("/api/usuarios/" + operario.getId() + "/ativo"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ---- Redefinição de senha ----

    @Test
    void redefineASenhaDeOutroUsuario() throws Exception {
        mvc.perform(comoAdmin(put("/api/usuarios/" + operario.getId() + "/senha"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"novaSenha\":\"senha-redefinida\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(login("caio@ambydata.demo", SENHA)).andExpect(status().isUnauthorized());
        mvc.perform(login("caio@ambydata.demo", "senha-redefinida")).andExpect(status().isOk());
    }

    @Test
    void redefinicaoExigeSenhaDe8Caracteres() throws Exception {
        mvc.perform(comoAdmin(put("/api/usuarios/" + operario.getId() + "/senha"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"novaSenha\":\"curta\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.novaSenha").isNotEmpty());
    }

    // ---- Apoio ----

    private List<MockHttpServletRequestBuilder> todasAsRotas() {
        String id = operario.getId();
        return List.of(
                get("/api/usuarios"),
                post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content(novoUsuario("Teste Rota", "rota" + System.nanoTime() + "@ambydata.demo", "senha-da-rota", "OPERARIO")),
                put("/api/usuarios/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content(edicao("Op. Caio", "caio@ambydata.demo", "OPERARIO")),
                patch("/api/usuarios/" + id + "/ativo").contentType(MediaType.APPLICATION_JSON).content("{\"ativo\":true}"),
                put("/api/usuarios/" + id + "/senha").contentType(MediaType.APPLICATION_JSON).content("{\"novaSenha\":\"" + SENHA + "\"}"));
    }

    private MockHttpServletRequestBuilder comoAdmin(MockHttpServletRequestBuilder requisicao) {
        return requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDe(admin));
    }

    private String tokenDe(Usuario usuario) {
        return jwtService.emitir(usuario).token();
    }

    private Usuario criar(String nome, String email, Perfil perfil) {
        return repositorio.save(new Usuario(null, nome, email, encoder.encode(SENHA), perfil, true));
    }

    private static MockHttpServletRequestBuilder login(String email, String senha) {
        return post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"senha\":\"" + senha + "\"}");
    }

    private static String novoUsuario(String nome, String email, String senha, String perfil) {
        return "{\"nome\":\"" + nome + "\",\"email\":\"" + email + "\",\"senha\":\"" + senha + "\",\"perfil\":\"" + perfil + "\"}";
    }

    private static String edicao(String nome, String email, String perfil) {
        return "{\"nome\":\"" + nome + "\",\"email\":\"" + email + "\",\"perfil\":\"" + perfil + "\"}";
    }
}
