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
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
    void bancoRecusaNomeRepetidoMesmoComOutraCaixa() {
        // A checagem do serviço tem corrida (dois POSTs juntos); quem garante é o índice do banco.
        Maquina copia = mongoTemplate.findOne(Query.query(Criteria.where("nome").is("Forno 02")), Maquina.class);
        copia.setId(null);
        copia.setNome("FORNO 02");
        assertThatThrownBy(() -> mongoTemplate.insert(copia)).isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void maquinaGuardaOsParametrosDeEnergia() throws Exception {
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON)
                        .content(maquina("Nova 12", 10, 30, 50)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.energia.potenciaKw").value(11.0))
                .andExpect(jsonPath("$.energia.potenciaRegeneradaKw").value(3.0))
                .andExpect(jsonPath("$.energia.percentualRegeneracao").value(15));
    }

    @Test
    void energiaInvalidaDevolve400NoCampo() throws Exception {
        String regeneraMaisQueConsome = maquina("Nova 13", 10, 30, 50).replace("\"potenciaRegeneradaKw\":3", "\"potenciaRegeneradaKw\":12");
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON).content(regeneraMaisQueConsome))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos['energia.potenciaRegeneradaKw']").isNotEmpty());

        String semPotencia = maquina("Nova 14", 10, 30, 50).replace("\"potenciaKw\":11", "\"potenciaKw\":0");
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON).content(semPotencia))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos['energia.potenciaKw']").isNotEmpty());

        String percentualDemais = maquina("Nova 15", 10, 30, 50).replace("\"percentualRegeneracao\":15", "\"percentualRegeneracao\":101");
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON).content(percentualDemais))
                .andExpect(status().isBadRequest());

        String semEnergia = maquina("Nova 16", 10, 30, 50).replaceAll(",\\s*\"energia\":\\{[^}]*}", "");
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON).content(semEnergia))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.energia").isNotEmpty());
    }

    @Test
    void operarioNaoRecebeCustoValorNemEnergia() throws Exception {
        mvc.perform(como(Perfil.OPERARIO, get("/api/maquinas")))
                .andExpect(jsonPath("$[0].nome").value("Forno 02"))
                .andExpect(jsonPath("$[0].faixaTemperatura.max").value(200.0))
                .andExpect(jsonPath("$[0].custoHora").doesNotExist())
                .andExpect(jsonPath("$[0].valorPorPeca").doesNotExist())
                .andExpect(jsonPath("$[0].energia").doesNotExist());
        mvc.perform(como(Perfil.OPERARIO, get("/api/maquinas/" + idDe("Forno 02"))))
                .andExpect(jsonPath("$.custoHora").doesNotExist());
        mvc.perform(como(Perfil.DIRETOR, get("/api/maquinas")))
                .andExpect(jsonPath("$[0].custoHora").value(150.0));
    }

    @Test
    void energiaComNaNOuInfinitoDevolve400() throws Exception {
        for (String valor : new String[] {"\"NaN\"", "\"Infinity\"", "1e999", "-0.01"}) {
            String corpo = maquina("Nova 20", 10, 30, 50).replace("\"potenciaKw\":11", "\"potenciaKw\":" + valor);
            mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON).content(corpo))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void faixaInvalidaDevolve400NoCampo() throws Exception {
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON)
                        .content(maquina("Nova 07", 30, 30, 50)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.faixaTemperatura").isNotEmpty());
    }

    @Test
    void temperaturaInfinitaOuForaDaFaixaFisicaDevolve400() throws Exception {
        // 1e999 vira Infinity no Jackson: sem limite, o crítico viraria ±∞ e nunca dispararia.
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON)
                        .content(maquina("Nova 09", 10, 30, 50).replace("\"max\":30.0", "\"max\":1e999")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos['faixaTemperatura.max']").isNotEmpty());
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON)
                        .content(maquina("Nova 10", -500, 30, 50)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos['faixaTemperatura.min']").isNotEmpty());
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/maquinas")).contentType(MediaType.APPLICATION_JSON)
                        .content(maquina("Nova 11", 10, 30, 50).replace("\"custoHora\":100", "\"custoHora\":1e999")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.custoHora").isNotEmpty());
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
                 "turnoPlanejado":{"inicio":"06:00","fim":"22:00"},
                 "energia":{"potenciaKw":11,"potenciaRegeneradaKw":3,"percentualRegeneracao":15}}
                """.formatted(nome, min, max, percentual);
    }
}
