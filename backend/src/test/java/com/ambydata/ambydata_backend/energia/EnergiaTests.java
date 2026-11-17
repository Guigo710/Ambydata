package com.ambydata.ambydata_backend.energia;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.auth.JwtService;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.ParametrosEnergia;
import com.ambydata.ambydata_backend.migracao.M002MaquinasIniciais;
import com.ambydata.ambydata_backend.migracao.M003Energia;
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
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class EnergiaTests {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private M002MaquinasIniciais m002;

    @Autowired
    private M003Energia m003;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private JwtService jwtService;

    private final Map<Perfil, String> tokens = new EnumMap<>(Perfil.class);

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        mongoTemplate.dropCollection(TarifasEnergia.class);
        m002.aplicar(mongoTemplate);
        m003.aplicar(mongoTemplate);
        usuarios.deleteAll();
        for (Perfil perfil : Perfil.values()) {
            Usuario u = usuarios.save(new Usuario(null, "U " + perfil, perfil.name().toLowerCase() + "@x.com", "hash", perfil, true));
            tokens.put(perfil, jwtService.emitir(u).token());
        }
    }

    @Test
    void m003PreencheAEnergiaDasMaquinasIniciaisEAsTarifas() {
        assertThat(maquina("Envasadora 04").getEnergia()).isEqualTo(new ParametrosEnergia(11.0, 3.0, 15));
        assertThat(maquina("Forno 02").getEnergia()).isEqualTo(new ParametrosEnergia(45.0, 0.0, 0));
        TarifasEnergia tarifas = mongoTemplate.findById(TarifasEnergia.ID, TarifasEnergia.class);
        assertThat(tarifas.getTarifaCheia()).isEqualTo(0.85);
        assertThat(tarifas.getTarifaCompensavel()).isEqualTo(0.55);
        assertThat(tarifas.getDemandaContratadaKw()).isEqualTo(150.0);
        assertThat(tarifas.getTarifaDemanda()).isEqualTo(40.0);
    }

    @Test
    void m003NaoSobrescreveOQueOEngenheiroJaAjustou() {
        Maquina forno = maquina("Forno 02");
        forno.setEnergia(new ParametrosEnergia(60.0, 0.0, 0));
        mongoTemplate.save(forno);
        TarifasEnergia tarifas = mongoTemplate.findById(TarifasEnergia.ID, TarifasEnergia.class);
        tarifas.setTarifaCheia(1.10);
        mongoTemplate.save(tarifas);

        m003.aplicar(mongoTemplate);

        assertThat(maquina("Forno 02").getEnergia().potenciaKw()).isEqualTo(60.0);
        assertThat(mongoTemplate.findById(TarifasEnergia.ID, TarifasEnergia.class).getTarifaCheia()).isEqualTo(1.10);
    }

    @ParameterizedTest
    @EnumSource(value = Perfil.class, names = {"ENGENHEIRO", "DIRETOR"})
    void engenheiroEDiretorVeemAsTarifas(Perfil perfil) throws Exception {
        mvc.perform(como(perfil, get("/api/energia/tarifas")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tarifaCheia").value(0.85))
                .andExpect(jsonPath("$.tarifaCompensavel").value(0.55))
                .andExpect(jsonPath("$.demandaContratadaKw").value(150.0))
                .andExpect(jsonPath("$.tarifaDemanda").value(40.0));
    }

    @ParameterizedTest
    @EnumSource(value = Perfil.class, names = {"OPERARIO", "ADMIN"})
    void operarioEAdminNaoVeemAsTarifas(Perfil perfil) throws Exception {
        mvc.perform(como(perfil, get("/api/energia/tarifas"))).andExpect(status().isForbidden());
    }

    @Test
    void soOEngenheiroAlteraAsTarifas() throws Exception {
        mvc.perform(como(Perfil.ENGENHEIRO, put("/api/energia/tarifas")).contentType(MediaType.APPLICATION_JSON)
                        .content(tarifas(0.92, 0.6, 200, 45)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tarifaCheia").value(0.92))
                .andExpect(jsonPath("$.atualizadoPor").value("U ENGENHEIRO"))
                .andExpect(jsonPath("$.atualizadoEm").isNotEmpty());
        assertThat(mongoTemplate.findById(TarifasEnergia.ID, TarifasEnergia.class).getDemandaContratadaKw()).isEqualTo(200.0);

        mvc.perform(como(Perfil.DIRETOR, put("/api/energia/tarifas")).contentType(MediaType.APPLICATION_JSON)
                        .content(tarifas(0.92, 0.6, 200, 45)))
                .andExpect(status().isForbidden());
    }

    @Test
    void tarifasInvalidasDevolvem400NoCampo() throws Exception {
        mvc.perform(como(Perfil.ENGENHEIRO, put("/api/energia/tarifas")).contentType(MediaType.APPLICATION_JSON)
                        .content(tarifas(0.5, 0.8, 150, 40)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.tarifaCompensavel").isNotEmpty());
        mvc.perform(como(Perfil.ENGENHEIRO, put("/api/energia/tarifas")).contentType(MediaType.APPLICATION_JSON)
                        .content(tarifas(0, 0, 150, 40)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.tarifaCheia").isNotEmpty());
        mvc.perform(como(Perfil.ENGENHEIRO, put("/api/energia/tarifas")).contentType(MediaType.APPLICATION_JSON)
                        .content(tarifas(0.85, 0.55, -1, 40)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.demandaContratadaKw").isNotEmpty());
    }

    @Test
    void tarifasComNaNOuInfinitoDevolvem400() throws Exception {
        for (String valor : new String[] {"\"NaN\"", "\"Infinity\"", "1e999"}) {
            mvc.perform(como(Perfil.ENGENHEIRO, put("/api/energia/tarifas")).contentType(MediaType.APPLICATION_JSON)
                            .content(tarifas(0.85, 0.55, 150, 40).replace("\"tarifaCheia\":0.85", "\"tarifaCheia\":" + valor)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void soOPutDasTarifasEAbertoAoEngenheiro() throws Exception {
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/energia/tarifas")).contentType(MediaType.APPLICATION_JSON)
                        .content(tarifas(0.85, 0.55, 150, 40)))
                .andExpect(status().isForbidden());
        mvc.perform(como(Perfil.ENGENHEIRO, delete("/api/energia/tarifas"))).andExpect(status().isForbidden());
    }

    private static String tarifas(double cheia, double compensavel, double demanda, double tarifaDemanda) {
        return """
                {"tarifaCheia":%s,"tarifaCompensavel":%s,"demandaContratadaKw":%s,"tarifaDemanda":%s}
                """.formatted(cheia, compensavel, demanda, tarifaDemanda);
    }

    private Maquina maquina(String nome) {
        return mongoTemplate.findOne(Query.query(Criteria.where("nome").is(nome)), Maquina.class);
    }

    private MockHttpServletRequestBuilder como(Perfil perfil, MockHttpServletRequestBuilder requisicao) {
        return requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokens.get(perfil));
    }
}
