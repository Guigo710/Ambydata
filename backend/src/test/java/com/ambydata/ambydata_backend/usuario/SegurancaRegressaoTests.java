package com.ambydata.ambydata_backend.usuario;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.auth.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Regressões dos achados da auditoria de segurança do módulo identity.
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class SegurancaRegressaoTests {

    private static final String SENHA = "senha-inicial-123";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UsuarioRepository repositorio;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtService jwtService;

    private Usuario admin;
    private Usuario operario;

    @BeforeEach
    void preparar() {
        repositorio.deleteAll();
        admin = repositorio.save(new Usuario(null, "Admin", "admin@ambydata.demo", encoder.encode(SENHA), Perfil.ADMIN, true));
        operario = repositorio.save(new Usuario(null, "Op", "op@ambydata.demo", encoder.encode(SENHA), Perfil.OPERARIO, true));
    }

    // [HIGH] Uma gravação com um objeto carregado antes não pode desfazer a desativação.
    @Test
    void trocaDeSenhaComObjetoAntigoNaoReativaUsuarioDesativado() {
        Usuario carregadoNoInicioDaRequisicao = repositorio.findById(operario.getId()).orElseThrow();
        usuarioService.alterarAtivo(operario.getId(), false, admin);

        usuarioService.trocarPropriaSenha(carregadoNoInicioDaRequisicao, SENHA, "senha-nova-123");

        assertThat(repositorio.findById(operario.getId()).orElseThrow().getAtivo()).isFalse();
    }

    @Test
    void trocaDeSenhaComObjetoAntigoNaoDesfazTrocaDePerfil() {
        Usuario carregadoNoInicioDaRequisicao = repositorio.findById(operario.getId()).orElseThrow();
        usuarioService.atualizar(operario.getId(), new AtualizarUsuarioRequest("Op", "op@ambydata.demo", Perfil.DIRETOR));

        usuarioService.trocarPropriaSenha(carregadoNoInicioDaRequisicao, SENHA, "senha-nova-123");

        assertThat(repositorio.findById(operario.getId()).orElseThrow().getPerfil()).isEqualTo(Perfil.DIRETOR);
    }

    @Test
    void edicaoPeloAdminNaoDesfazSenhaRedefinida() {
        usuarioService.redefinirSenha(operario.getId(), "senha-redefinida-1");
        usuarioService.atualizar(operario.getId(), new AtualizarUsuarioRequest("Op Novo", "op@ambydata.demo", Perfil.OPERARIO));

        assertThat(usuarioService.autenticar("op@ambydata.demo", "senha-redefinida-1")).isPresent();
    }

    // [MEDIUM] O login roda o BCrypt mesmo quando o e-mail não existe ou o usuário está inativo.
    @Test
    void loginSempreConfereASenhaParaNaoRevelarEmailsPeloTempo() {
        UsuarioRepository repoFalso = mock(UsuarioRepository.class);
        PasswordEncoder encoderEspiao = spy(new BCryptPasswordEncoder(4));
        UsuarioService servico = new UsuarioService(repoFalso, encoderEspiao, mock(MongoTemplate.class));

        when(repoFalso.findByEmail("ninguem@x.com")).thenReturn(Optional.empty());
        assertThat(servico.autenticar("ninguem@x.com", "qualquer")).isEmpty();

        Usuario inativo = new Usuario("1", "I", "inativo@x.com", encoderEspiao.encode("qualquer"), Perfil.OPERARIO, false);
        when(repoFalso.findByEmail("inativo@x.com")).thenReturn(Optional.of(inativo));
        assertThat(servico.autenticar("inativo@x.com", "qualquer")).isEmpty();

        verify(encoderEspiao, times(2)).matches(anyString(), anyString());
    }

    // [LOW] Mensagens internas não chegam ao cliente; senha tem no máximo 72 bytes.
    @Test
    void senhaComMaisDe72CaracteresDevolveErroNoCampo() throws Exception {
        mvc.perform(comoAdmin(post("/api/usuarios")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"X\",\"email\":\"x@ambydata.demo\",\"senha\":\"" + "a".repeat(73) + "\",\"perfil\":\"OPERARIO\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.senha").isNotEmpty());
    }

    @Test
    void senhaComMaisDe72BytesEmAcentosDevolveMensagemEmPortugues() throws Exception {
        String senha = "ç".repeat(40); // 40 caracteres, 80 bytes em UTF-8
        mvc.perform(comoAdmin(put("/api/usuarios/" + operario.getId() + "/senha")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"novaSenha\":\"" + senha + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A senha pode ter no máximo 72 bytes."))
                .andExpect(content().string(not(containsString("password"))));
    }

    @Test
    void senhaAtualIncorretaContinuaComMensagemPropria() throws Exception {
        mvc.perform(put("/api/auth/me/senha").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.emitir(operario).token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"senhaAtual\":\"errada-errada\",\"novaSenha\":\"senha-nova-123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Senha atual incorreta."));
    }

    // [INFO] O logout padrão do Spring (302 para /login) não existe: a sessão é só o token.
    @Test
    void logoutPadraoDoSpringNaoExiste() throws Exception {
        mvc.perform(post("/logout")).andExpect(status().isUnauthorized());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder comoAdmin(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder requisicao) {
        return requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.emitir(admin).token());
    }
}
