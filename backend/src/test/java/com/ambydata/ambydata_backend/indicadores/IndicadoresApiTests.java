package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.auth.JwtService;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.migracao.M002MaquinasIniciais;
import com.ambydata.ambydata_backend.simulacao.Leitura;
import com.ambydata.ambydata_backend.simulacao.OrigemLeitura;
import com.ambydata.ambydata_backend.simulacao.SimuladorLeituras;
import com.ambydata.ambydata_backend.simulacao.StatusMaquina;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.lessThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class IndicadoresApiTests {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private M002MaquinasIniciais m002;

    @Autowired
    private com.ambydata.ambydata_backend.migracao.M003Energia m003;

    @Autowired
    private SimuladorLeituras simulador;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private JwtService jwtService;

    private final Map<Perfil, String> tokens = new EnumMap<>(Perfil.class);
    private Maquina forno;

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        m002.aplicar(mongoTemplate);
        m003.aplicar(mongoTemplate);
        mongoTemplate.remove(new Query(), Leitura.class);
        simulador.preencherLacunas(Instant.now()); // a última hora de leituras, como na subida
        forno = mongoTemplate.findOne(Query.query(Criteria.where("nome").is("Forno 02")), Maquina.class);
        usuarios.deleteAll();
        for (Perfil perfil : Perfil.values()) {
            Usuario u = usuarios.save(new Usuario(null, "U " + perfil, perfil.name().toLowerCase() + "@x.com", "hash", perfil, true));
            tokens.put(perfil, jwtService.emitir(u).token());
        }
    }

    @ParameterizedTest
    @EnumSource(value = Perfil.class, names = {"OPERARIO", "ENGENHEIRO", "DIRETOR"})
    void producaoVeOResumoDeTodasAsMaquinasAtivas(Perfil perfil) throws Exception {
        mvc.perform(como(perfil, get("/api/indicadores/resumo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$[0].maquina.nome").value("Forno 02"))
                .andExpect(jsonPath("$[0].maquina.limiteCritico.max").value(220.0))
                .andExpect(jsonPath("$[0].ultimaLeitura.origem").value("SIMULADOR"))
                .andExpect(jsonPath("$[0].ultimaLeitura.situacaoTemperatura").isNotEmpty())
                .andExpect(jsonPath("$[0].ultimaHora.totais.segundosPlanejados").isNumber())
                .andExpect(jsonPath("$[0].ultimaHora.indicadores").exists());
    }

    @Test
    void adminNaoVeIndicadoresESemTokenE401() throws Exception {
        mvc.perform(como(Perfil.ADMIN, get("/api/indicadores/resumo"))).andExpect(status().isForbidden());
        mvc.perform(como(Perfil.ADMIN, get("/api/indicadores/maquinas/" + forno.getId() + "/agora"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/indicadores/resumo")).andExpect(status().isUnauthorized());
    }

    @Test
    void maquinaInativaSaiDoResumo() throws Exception {
        forno.setAtiva(false);
        mongoTemplate.save(forno);
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/resumo"))).andExpect(jsonPath("$", hasSize(5)));
    }

    @Test
    void temperaturaAlemDoLimiteApareceComoCritica() throws Exception {
        Instant agora = Instant.now();
        mongoTemplate.save(new Leitura(Leitura.idDe(forno.getId(), agora), forno.getId(), agora, StatusMaquina.OPERANDO,
                230.0, 5, 5, 0, OrigemLeitura.DISPOSITIVO));

        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/resumo")))
                .andExpect(jsonPath("$[0].ultimaLeitura.temperatura").value(230.0))
                .andExpect(jsonPath("$[0].ultimaLeitura.origem").value("DISPOSITIVO"))
                .andExpect(jsonPath("$[0].ultimaLeitura.situacaoTemperatura").value("CRITICO"));
    }

    @Test
    void agoraDeUmaMaquina() throws Exception {
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/maquinas/" + forno.getId() + "/agora")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maquina.nome").value("Forno 02"))
                .andExpect(jsonPath("$.frequenciaSegundos").value(10))
                .andExpect(jsonPath("$.turno.inicio").isNotEmpty())
                .andExpect(jsonPath("$.ultimaHora.totais").exists());
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/maquinas/nao-existe/agora"))).andExpect(status().isNotFound());
    }

    @Test
    void leiturasParaOGraficoEmOrdemComLimiteDeMinutos() throws Exception {
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/leituras/" + forno.getId() + "?minutos=30")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThan(170)))
                .andExpect(jsonPath("$.length()", lessThanOrEqualTo(181)))
                .andExpect(jsonPath("$[0].temperatura").isNumber())
                .andExpect(jsonPath("$[0].status").isNotEmpty());
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/leituras/" + forno.getId() + "?minutos=0")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.minutos").isNotEmpty());
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/leituras/" + forno.getId() + "?minutos=361")))
                .andExpect(status().isBadRequest());
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/leituras/nao-existe"))).andExpect(status().isNotFound());
    }

    @Test
    void historicoEComparativoParaAProducao() throws Exception {
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/maquinas/" + forno.getId() + "/historico?horas=24")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.horas", hasSize(24)))
                .andExpect(jsonPath("$.maquina.nome").value("Forno 02"));
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/comparativo?periodo=24h&por=linha")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.grupos[0].grupo").value("Linha A"));
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/comparativo?periodo=1ano&por=linha")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.periodo").isNotEmpty());
    }

    @ParameterizedTest
    @EnumSource(value = Perfil.class, names = {"OPERARIO", "ENGENHEIRO", "ADMIN"})
    void financeiroSoParaODiretor(Perfil perfil) throws Exception {
        mvc.perform(como(perfil, get("/api/indicadores/financeiro?periodo=24h"))).andExpect(status().isForbidden());
    }

    @Test
    void diretorVeOFinanceiro() throws Exception {
        mvc.perform(como(Perfil.DIRETOR, get("/api/indicadores/financeiro?periodo=7d")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maquinas", hasSize(6)))
                .andExpect(jsonPath("$.total.lucro").isNumber());
    }

    @ParameterizedTest
    @EnumSource(value = Perfil.class, names = {"ENGENHEIRO", "DIRETOR"})
    void energiaParaEngenheiroEDiretor(Perfil perfil) throws Exception {
        mvc.perform(como(perfil, get("/api/indicadores/energia?periodo=24h")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maquinas", hasSize(6)))
                .andExpect(jsonPath("$.total.encargosDemanda").isNumber())
                .andExpect(jsonPath("$.tarifas.tarifaCheia").isNumber());
    }

    @ParameterizedTest
    @EnumSource(value = Perfil.class, names = {"OPERARIO", "ADMIN"})
    void energiaNaoEParaOperarioNemAdmin(Perfil perfil) throws Exception {
        mvc.perform(como(perfil, get("/api/indicadores/energia?periodo=24h"))).andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @EnumSource(value = Perfil.class, names = {"OPERARIO", "ENGENHEIRO", "DIRETOR"})
    void indicadoresNaoLevamCustoValorNemEnergiaDaMaquina(Perfil perfil) throws Exception {
        // Com custoHora, valorPorPeca e as horas, qualquer perfil refaria o financeiro (só DIRETOR).
        mvc.perform(como(perfil, get("/api/indicadores/resumo")))
                .andExpect(jsonPath("$[0].maquina.nome").value("Forno 02"))
                .andExpect(jsonPath("$[0].maquina.custoHora").doesNotExist())
                .andExpect(jsonPath("$[0].maquina.valorPorPeca").doesNotExist())
                .andExpect(jsonPath("$[0].maquina.energia").doesNotExist());
        mvc.perform(como(perfil, get("/api/indicadores/maquinas/" + forno.getId() + "/agora")))
                .andExpect(jsonPath("$.maquina.limiteCritico.max").value(220.0))
                .andExpect(jsonPath("$.maquina.custoHora").doesNotExist());
        mvc.perform(como(perfil, get("/api/indicadores/maquinas/" + forno.getId() + "/historico?horas=24")))
                .andExpect(jsonPath("$.maquina.valorPorPeca").doesNotExist());
    }

    @Test
    void parametroComTipoErradoDevolve400NoFormatoPadrao() throws Exception {
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/leituras/" + forno.getId() + "?minutos=abc")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Dados inválidos."))
                .andExpect(jsonPath("$.campos.minutos").isNotEmpty());
        mvc.perform(como(Perfil.OPERARIO, get("/api/indicadores/maquinas/" + forno.getId() + "/historico?horas=99999999999")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.horas").isNotEmpty());
    }

    private MockHttpServletRequestBuilder como(Perfil perfil, MockHttpServletRequestBuilder requisicao) {
        return requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokens.get(perfil));
    }
}
