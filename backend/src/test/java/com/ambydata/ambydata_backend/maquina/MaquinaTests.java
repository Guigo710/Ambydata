package com.ambydata.ambydata_backend.maquina;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.auth.JwtService;
import com.ambydata.ambydata_backend.migracao.M002MaquinasIniciais;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class MaquinaTests {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private M002MaquinasIniciais m002;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private JwtService jwtService;

    private final Map<Perfil, String> tokens = new EnumMap<>(Perfil.class);

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        m002.aplicar(mongoTemplate);
        usuarios.deleteAll();
        for (Perfil perfil : Perfil.values()) {
            Usuario u = usuarios.save(new Usuario(null, "U " + perfil, perfil.name().toLowerCase() + "@x.com", "hash", perfil, true));
            tokens.put(perfil, jwtService.emitir(u).token());
        }
    }

    @Test
    void seedTemAsSeisMaquinasOrdenadasPorLinhaENome() throws Exception {
        mvc.perform(como(Perfil.OPERARIO, get("/api/maquinas")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$[0].nome").value("Forno 02"))
                .andExpect(jsonPath("$[0].linha").value("Linha A"))
                .andExpect(jsonPath("$[5].nome").value("Seladora 05"))
                .andExpect(jsonPath("$[0].faixaTemperatura.max").value(200.0))
                .andExpect(jsonPath("$[0].alertas.percentualCritico").value(50));
    }

    @Test
    void seedNaoDuplicaAoRodarDeNovo() {
        m002.aplicar(mongoTemplate);
        assertThat(mongoTemplate.count(new org.springframework.data.mongodb.core.query.Query(), Maquina.class)).isEqualTo(6);
    }

    @ParameterizedTest
    @EnumSource(value = Perfil.class, names = {"OPERARIO", "ENGENHEIRO", "DIRETOR"})
    void perfisDeProducaoVeemAsMaquinas(Perfil perfil) throws Exception {
        mvc.perform(como(perfil, get("/api/maquinas"))).andExpect(status().isOk());
    }

    @Test
    void adminNaoVeProducao() throws Exception {
        mvc.perform(como(Perfil.ADMIN, get("/api/maquinas"))).andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @EnumSource(value = Perfil.class, names = {"OPERARIO", "DIRETOR", "ADMIN"})
    void soOEngenheiroAlteraMaquinas(Perfil perfil) throws Exception {
        String id = idDe("Forno 02");
        mvc.perform(como(perfil, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON).content(maquina("Nova 07", 10, 30, 50)))
                .andExpect(status().isForbidden());
        mvc.perform(como(perfil, put("/api/maquinas/" + id)).contentType(MediaType.APPLICATION_JSON).content(maquina("Forno 02", 160, 200, 50)))
                .andExpect(status().isForbidden());
        mvc.perform(como(perfil, patch("/api/maquinas/" + id + "/ativa")).contentType(MediaType.APPLICATION_JSON).content("{\"ativa\":false}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void engenheiroCriaMaquinaComParametrosEAlertas() throws Exception {
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON)
                        .content(maquina("Pasteurizador 07", 70, 80, 30)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.nome").value("Pasteurizador 07"))
                .andExpect(jsonPath("$.ativa").value(true))
                .andExpect(jsonPath("$.alertas.percentualCritico").value(30))
                .andExpect(jsonPath("$.limiteCritico.max").value(83.0))
                .andExpect(jsonPath("$.limiteCritico.min").value(67.0));
    }

    @Test
    void nomeDuplicadoDevolve400NoCampo() throws Exception {
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON)
                        .content(maquina("forno 02", 160, 200, 50)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nome").isNotEmpty());
    }

    @Test
    void faixaInvalidaDevolve400NoCampo() throws Exception {
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON)
                        .content(maquina("Nova 07", 30, 30, 50)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.faixaTemperatura").isNotEmpty());
    }

    @Test
    void percentualCriticoForaDoIntervaloDevolve400() throws Exception {
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON)
                        .content(maquina("Nova 07", 10, 30, 0)))
                .andExpect(status().isBadRequest());
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON)
                        .content(maquina("Nova 08", 10, 30, 501)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void engenheiroEditaParametrosEDesativa() throws Exception {
        String id = idDe("Forno 02");
        mvc.perform(como(Perfil.ENGENHEIRO, put("/api/maquinas/" + id)).contentType(MediaType.APPLICATION_JSON)
                        .content(maquina("Forno 02", 170, 210, 25)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.faixaTemperatura.min").value(170.0))
                .andExpect(jsonPath("$.alertas.percentualCritico").value(25));

        mvc.perform(como(Perfil.ENGENHEIRO, patch("/api/maquinas/" + id + "/ativa")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ativa\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativa").value(false));

        mvc.perform(como(Perfil.OPERARIO, get("/api/maquinas?ativas=true")))
                .andExpect(jsonPath("$", hasSize(5)));
        mvc.perform(como(Perfil.ENGENHEIRO, get("/api/maquinas")))
                .andExpect(jsonPath("$", hasSize(6)));
    }

    @Test
    void maquinaInexistenteDevolve404() throws Exception {
        mvc.perform(como(Perfil.ENGENHEIRO, get("/api/maquinas/nao-existe"))).andExpect(status().isNotFound());
    }

    private String idDe(String nome) {
        return mongoTemplate.findOne(org.springframework.data.mongodb.core.query.Query.query(
                org.springframework.data.mongodb.core.query.Criteria.where("nome").is(nome)), Maquina.class).getId();
    }

    private MockHttpServletRequestBuilder como(Perfil perfil, MockHttpServletRequestBuilder requisicao) {
        return requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokens.get(perfil));
    }

    private static String maquina(String nome, double min, double max, int percentual) {
        return """
                {"nome":"%s","tipo":"OUTRA","setor":"Teste","linha":"Linha C","cadenciaIdeal":50,
                 "faixaTemperatura":{"min":%s,"max":%s},
                 "alertas":{"percentualCritico":%d,"minutosParadoMax":15,"taxaDefeitosMax":8},
                 "custoHora":100,"valorPorPeca":2,
                 "turnoPlanejado":{"inicio":"06:00","fim":"22:00"}}
                """.formatted(nome, min, max, percentual);
    }
}
