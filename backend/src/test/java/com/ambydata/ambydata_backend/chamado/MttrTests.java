package com.ambydata.ambydata_backend.chamado;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.auth.JwtService;
import com.ambydata.ambydata_backend.usuario.Perfil;
import com.ambydata.ambydata_backend.usuario.Usuario;
import com.ambydata.ambydata_backend.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.Map;

import static org.hamcrest.Matchers.closeTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// MTTR = média de (finalização − abertura) dos chamados finalizados no período (contas à mão).
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class MttrTests {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private JwtService jwtService;

    private final Map<Perfil, String> tokens = new EnumMap<>(Perfil.class);

    @BeforeEach
    void preparar() {
        mongoTemplate.remove(new Query(), Chamado.class);
        usuarios.deleteAll();
        for (Perfil perfil : Perfil.values()) {
            Usuario u = usuarios.save(new Usuario(null, "U " + perfil, perfil.name().toLowerCase() + "@x.com", "hash", perfil, true));
            tokens.put(perfil, jwtService.emitir(u).token());
        }
        Instant agora = Instant.now();
        inserir("forno", StatusChamado.FINALIZADO, agora.minus(Duration.ofDays(1)), Duration.ofMinutes(30));
        inserir("forno", StatusChamado.FINALIZADO, agora.minus(Duration.ofDays(2)), Duration.ofMinutes(90));
        inserir("forno", StatusChamado.FINALIZADO, agora.minus(Duration.ofDays(9)), Duration.ofMinutes(600)); // fora dos 7 dias
        inserir("forno", StatusChamado.CANCELADO, agora.minus(Duration.ofDays(1)), Duration.ofMinutes(5));   // não conta
        inserir("envasadora", StatusChamado.FINALIZADO, agora.minus(Duration.ofDays(3)), Duration.ofMinutes(20));
    }

    @ParameterizedTest
    @EnumSource(value = Perfil.class, names = {"ENGENHEIRO", "DIRETOR"})
    void mttrDaMaquinaNosUltimos7Dias(Perfil perfil) throws Exception {
        // (30 + 90) ÷ 2 = 60 min
        mvc.perform(como(perfil, get("/api/chamados/mttr?maquinaId=forno")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chamadosFinalizados").value(2))
                .andExpect(jsonPath("$.mttrMinutos", closeTo(60.0, 1e-6)))
                .andExpect(jsonPath("$.dias").value(7));
    }

    @Test
    void semMaquinaEDaFabricaInteira() throws Exception {
        // (30 + 90 + 20) ÷ 3 = 46,67 min
        mvc.perform(como(Perfil.DIRETOR, get("/api/chamados/mttr")))
                .andExpect(jsonPath("$.chamadosFinalizados").value(3))
                .andExpect(jsonPath("$.mttrMinutos", closeTo(140.0 / 3, 1e-6)));
    }

    @Test
    void semChamadosFinalizadosNaoHaMttr() throws Exception {
        mvc.perform(como(Perfil.ENGENHEIRO, get("/api/chamados/mttr?maquinaId=seladora")))
                .andExpect(jsonPath("$.chamadosFinalizados").value(0))
                .andExpect(jsonPath("$.mttrMinutos").doesNotExist());
    }

    @Test
    void permissoesEDias() throws Exception {
        mvc.perform(como(Perfil.OPERARIO, get("/api/chamados/mttr"))).andExpect(status().isForbidden());
        mvc.perform(como(Perfil.ADMIN, get("/api/chamados/mttr"))).andExpect(status().isForbidden());
        mvc.perform(como(Perfil.DIRETOR, get("/api/chamados/mttr?dias=0")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.dias").isNotEmpty());
        mvc.perform(como(Perfil.DIRETOR, get("/api/chamados/mttr?dias=31"))).andExpect(status().isBadRequest());
        mvc.perform(como(Perfil.DIRETOR, get("/api/chamados/mttr?dias=10")))
                .andExpect(jsonPath("$.chamadosFinalizados").value(4));
    }

    private void inserir(String maquinaId, StatusChamado status, Instant fim, Duration duracao) {
        Chamado c = new Chamado();
        c.setTipo(TipoChamado.OUTRO);
        c.setMaquinaId(maquinaId);
        c.setMaquinaNome(maquinaId);
        c.setDescricao("x");
        c.setPrioridade(Prioridade.MEDIA);
        c.setStatus(status);
        c.setAbertoPor(new PessoaChamado(null, "Fulano", false));
        c.setAbertoEm(fim.minus(duracao));
        if (status == StatusChamado.FINALIZADO) {
            c.setFinalizadoEm(fim);
        } else {
            c.setCanceladoEm(fim);
        }
        c.setHistorico(new ArrayList<>());
        mongoTemplate.insert(c);
    }

    private MockHttpServletRequestBuilder como(Perfil perfil, MockHttpServletRequestBuilder requisicao) {
        return requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokens.get(perfil));
    }
}
