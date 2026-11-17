package com.ambydata.ambydata_backend.chamado;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.auth.JwtService;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.migracao.M002MaquinasIniciais;
import com.ambydata.ambydata_backend.usuario.Perfil;
import com.ambydata.ambydata_backend.usuario.Usuario;
import com.ambydata.ambydata_backend.usuario.UsuarioRepository;
import com.jayway.jsonpath.JsonPath;
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

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class ChamadoTests {

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

    @Autowired
    private ChamadoService servico;

    private final Map<Perfil, String> tokens = new EnumMap<>(Perfil.class);
    private final Map<Perfil, Usuario> pessoas = new EnumMap<>(Perfil.class);
    private Maquina forno;

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        m002.aplicar(mongoTemplate);
        mongoTemplate.remove(new Query(), Chamado.class);
        forno = mongoTemplate.findOne(Query.query(Criteria.where("nome").is("Forno 02")), Maquina.class);
        usuarios.deleteAll();
        for (Perfil perfil : Perfil.values()) {
            Usuario u = usuarios.save(new Usuario(null, "U " + perfil, perfil.name().toLowerCase() + "@x.com", "hash", perfil, true));
            pessoas.put(perfil, u);
            tokens.put(perfil, jwtService.emitir(u).token());
        }
    }

    @Test
    void operarioAbreChamadoQueApareceEmAbertosComTudoQueOCardPrecisa() throws Exception {
        mvc.perform(abrir(Perfil.OPERARIO, forno.getId(), "Barulho estranho no motor do forno."))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ABERTO"))
                .andExpect(jsonPath("$.tipo").value("MECANICO"))
                .andExpect(jsonPath("$.prioridade").value("ALTA"))
                .andExpect(jsonPath("$.descricao").value("Barulho estranho no motor do forno."))
                .andExpect(jsonPath("$.maquinaNome").value("Forno 02"))
                .andExpect(jsonPath("$.setor").value("Cozimento"))
                .andExpect(jsonPath("$.linha").value("Linha A"))
                .andExpect(jsonPath("$.abertoPor.nome").value("U OPERARIO"))
                .andExpect(jsonPath("$.abertoPor.sistema").value(false))
                .andExpect(jsonPath("$.abertoEm").isNotEmpty())
                .andExpect(jsonPath("$.historico", hasSize(1)))
                .andExpect(jsonPath("$.historico[0].tipo").value("ABERTO"))
                .andExpect(jsonPath("$.ativoAutomatico").doesNotExist());

        mvc.perform(como(Perfil.ENGENHEIRO, get("/api/chamados")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].maquinaNome").value("Forno 02"));
    }

    @Test
    void engenheiroTambemAbreDiretorEAdminNao() throws Exception {
        mvc.perform(abrir(Perfil.ENGENHEIRO, forno.getId(), "Trocar termopar.")).andExpect(status().isCreated());
        mvc.perform(abrir(Perfil.DIRETOR, forno.getId(), "x")).andExpect(status().isForbidden());
        mvc.perform(abrir(Perfil.ADMIN, forno.getId(), "x")).andExpect(status().isForbidden());
        mvc.perform(como(Perfil.ADMIN, get("/api/chamados"))).andExpect(status().isForbidden());
    }

    @Test
    void validacoesAoAbrir() throws Exception {
        mvc.perform(abrir(Perfil.OPERARIO, forno.getId(), " "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.descricao").isNotEmpty());
        mvc.perform(abrir(Perfil.OPERARIO, "nao-existe", "x")).andExpect(status().isNotFound());
        forno.setAtiva(false);
        mongoTemplate.save(forno);
        mvc.perform(abrir(Perfil.OPERARIO, forno.getId(), "x"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.maquinaId").isNotEmpty());
    }

    @Test
    void cicloCompletoAssumirEFinalizarComHistorico() throws Exception {
        String id = abrirERetornarId();

        mvc.perform(como(Perfil.OPERARIO, post("/api/chamados/" + id + "/assumir"))).andExpect(status().isForbidden());
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/chamados/" + id + "/finalizar")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"solucao\":\"x\"}"))
                .andExpect(status().isConflict());

        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/chamados/" + id + "/assumir")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EM_ANDAMENTO"))
                .andExpect(jsonPath("$.responsavel.nome").value("U ENGENHEIRO"))
                .andExpect(jsonPath("$.assumidoEm").isNotEmpty());
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/chamados/" + id + "/assumir"))).andExpect(status().isConflict());

        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/chamados/" + id + "/finalizar")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"solucao\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.solucao").isNotEmpty());
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/chamados/" + id + "/finalizar")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"solucao\":\"Rolamento trocado.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FINALIZADO"))
                .andExpect(jsonPath("$.solucao").value("Rolamento trocado."))
                .andExpect(jsonPath("$.finalizadoEm").isNotEmpty());

        mvc.perform(como(Perfil.OPERARIO, get("/api/chamados/" + id)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.historico", hasSize(3)))
                .andExpect(jsonPath("$.historico[1].tipo").value("ASSUMIDO"))
                .andExpect(jsonPath("$.historico[2].tipo").value("FINALIZADO"))
                .andExpect(jsonPath("$.historico[2].por").value("U ENGENHEIRO"));
        mvc.perform(como(Perfil.OPERARIO, get("/api/chamados/nao-existe"))).andExpect(status().isNotFound());
    }

    @Test
    void cancelarPedeMotivoESoValeParaAbertoOuEmAndamento() throws Exception {
        String id = abrirERetornarId();
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/chamados/" + id + "/cancelar")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/chamados/" + id + "/cancelar")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Aberto em duplicidade.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELADO"))
                .andExpect(jsonPath("$.motivoCancelamento").value("Aberto em duplicidade."));
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/chamados/" + id + "/cancelar")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"de novo\"}"))
                .andExpect(status().isConflict());
        mvc.perform(como(Perfil.DIRETOR, post("/api/chamados/" + id + "/cancelar")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"x\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void listaFinalizadosDos7DiasSemCanceladosEFiltraPorMaquina() throws Exception {
        Instant agora = Instant.now();
        inserir(StatusChamado.ABERTO, forno, null);
        inserir(StatusChamado.FINALIZADO, forno, agora.minus(Duration.ofDays(6)));
        inserir(StatusChamado.FINALIZADO, forno, agora.minus(Duration.ofDays(8)));
        inserir(StatusChamado.CANCELADO, forno, null);
        Maquina envasadora = mongoTemplate.findOne(Query.query(Criteria.where("nome").is("Envasadora 04")), Maquina.class);
        inserir(StatusChamado.EM_ANDAMENTO, envasadora, null);

        mvc.perform(como(Perfil.OPERARIO, get("/api/chamados"))).andExpect(jsonPath("$", hasSize(3)));
        mvc.perform(como(Perfil.OPERARIO, get("/api/chamados?maquinaId=" + forno.getId()))).andExpect(jsonPath("$", hasSize(2)));
        mvc.perform(como(Perfil.OPERARIO, get("/api/chamados?status=CANCELADO"))).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(como(Perfil.OPERARIO, get("/api/chamados?status=INVENTADO")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.status").isNotEmpty());
    }

    @Test
    void soOResponsavelFinalizaOuCancelaOQueAssumiu() throws Exception {
        String id = abrirERetornarId();
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/chamados/" + id + "/assumir"))).andExpect(status().isOk());
        Usuario outro = usuarios.save(new Usuario(null, "Outro Eng", "outro@x.com", "hash", Perfil.ENGENHEIRO, true));
        String tokenOutro = jwtService.emitir(outro).token();

        mvc.perform(post("/api/chamados/" + id + "/finalizar").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenOutro)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"solucao\":\"x\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value(org.hamcrest.Matchers.containsString("U ENGENHEIRO")));
        mvc.perform(post("/api/chamados/" + id + "/cancelar").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenOutro)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"x\"}"))
                .andExpect(status().isConflict());
        assertThat(mongoTemplate.findById(id, Chamado.class).getStatus()).isEqualTo(StatusChamado.EM_ANDAMENTO);
    }

    @Test
    void respostaNaoExpoeOIdDosUsuarios() throws Exception {
        String id = abrirERetornarId();
        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/chamados/" + id + "/assumir")))
                .andExpect(jsonPath("$.abertoPor.nome").value("U OPERARIO"))
                .andExpect(jsonPath("$.abertoPor.usuarioId").doesNotExist())
                .andExpect(jsonPath("$.responsavel.usuarioId").doesNotExist());
    }

    @Test
    void quemAbreChamadosDemaisEmPoucoTempoEBarrado() throws Exception {
        for (int i = 0; i < ChamadoService.MAXIMO_POR_JANELA; i++) {
            mvc.perform(abrir(Perfil.OPERARIO, forno.getId(), "Chamado " + i)).andExpect(status().isCreated());
        }
        mvc.perform(abrir(Perfil.OPERARIO, forno.getId(), "Mais um"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.erro").isNotEmpty());
        mvc.perform(abrir(Perfil.ENGENHEIRO, forno.getId(), "Outra pessoa pode")).andExpect(status().isCreated());
    }

    @Test
    void finalizadosEmMassaNaoEscondemOsAbertos() throws Exception {
        for (int i = 0; i < ChamadoService.LIMITE_FINALIZADOS + 50; i++) {
            inserir(StatusChamado.FINALIZADO, forno, Instant.now().minus(Duration.ofHours(1)));
        }
        inserir(StatusChamado.ABERTO, forno, null);

        mvc.perform(como(Perfil.ENGENHEIRO, get("/api/chamados")))
                .andExpect(jsonPath("$.length()").value(ChamadoService.LIMITE_FINALIZADOS + 1))
                .andExpect(jsonPath("$[?(@.status == 'ABERTO')]", hasSize(1)))
                .andExpect(jsonPath("$[0].historico").doesNotExist());
    }

    @Test
    void doisEngenheirosAssumindoJuntosSoUmConsegue() throws Exception {
        String id = abrirERetornarId();
        Usuario outro = usuarios.save(new Usuario(null, "Outro Engenheiro", "outro@x.com", "hash", Perfil.ENGENHEIRO, true));
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<Callable<Boolean>> tentativas = new ArrayList<>();
        for (Usuario u : List.of(pessoas.get(Perfil.ENGENHEIRO), outro)) {
            tentativas.add(() -> {
                try {
                    servico.assumir(id, u);
                    return true;
                } catch (TransicaoInvalidaException e) {
                    return false;
                }
            });
        }
        int sucessos = 0;
        for (Future<Boolean> f : pool.invokeAll(tentativas)) {
            sucessos += f.get() ? 1 : 0;
        }
        pool.shutdown();

        assertThat(sucessos).isEqualTo(1);
        assertThat(mongoTemplate.findById(id, Chamado.class).getHistorico()).hasSize(2);
    }

    private void inserir(StatusChamado status, Maquina m, Instant finalizadoEm) {
        Chamado c = new Chamado();
        c.setTipo(TipoChamado.OUTRO);
        c.setMaquinaId(m.getId());
        c.setMaquinaNome(m.getNome());
        c.setSetor(m.getSetor());
        c.setLinha(m.getLinha());
        c.setDescricao("x");
        c.setPrioridade(Prioridade.MEDIA);
        c.setStatus(status);
        c.setAbertoPor(new PessoaChamado(null, "Fulano", false));
        c.setAbertoEm(Instant.now().minus(Duration.ofDays(9)));
        c.setFinalizadoEm(finalizadoEm);
        c.setHistorico(new ArrayList<>());
        mongoTemplate.insert(c);
    }

    private String abrirERetornarId() throws Exception {
        String corpo = mvc.perform(abrir(Perfil.OPERARIO, forno.getId(), "Vazamento."))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(corpo, "$.id");
    }

    private MockHttpServletRequestBuilder abrir(Perfil perfil, String maquinaId, String descricao) {
        return como(perfil, post("/api/chamados")).contentType(MediaType.APPLICATION_JSON).content("""
                {"tipo":"MECANICO","maquinaId":"%s","descricao":"%s","prioridade":"ALTA"}
                """.formatted(maquinaId, descricao));
    }

    private MockHttpServletRequestBuilder como(Perfil perfil, MockHttpServletRequestBuilder requisicao) {
        return requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokens.get(perfil));
    }
}
