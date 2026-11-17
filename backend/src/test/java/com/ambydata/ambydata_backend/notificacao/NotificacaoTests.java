package com.ambydata.ambydata_backend.notificacao;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.auth.JwtService;
import com.ambydata.ambydata_backend.chamado.AbrirChamadoRequest;
import com.ambydata.ambydata_backend.chamado.Chamado;
import com.ambydata.ambydata_backend.chamado.ChamadoService;
import com.ambydata.ambydata_backend.chamado.Prioridade;
import com.ambydata.ambydata_backend.chamado.TipoChamado;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.migracao.M002MaquinasIniciais;
import com.ambydata.ambydata_backend.usuario.Perfil;
import com.ambydata.ambydata_backend.usuario.Usuario;
import com.ambydata.ambydata_backend.usuario.UsuarioRepository;
import com.jayway.jsonpath.JsonPath;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class NotificacaoTests {

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
    private ChamadoService chamados;

    @Autowired
    private NotificacaoService notificacoes;

    private final Map<Perfil, String> tokens = new EnumMap<>(Perfil.class);
    private final Map<Perfil, Usuario> pessoas = new EnumMap<>(Perfil.class);
    private Maquina forno;

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        m002.aplicar(mongoTemplate);
        mongoTemplate.remove(new Query(), Chamado.class);
        mongoTemplate.remove(new Query(), Notificacao.class);
        forno = mongoTemplate.findOne(Query.query(Criteria.where("nome").is("Forno 02")), Maquina.class);
        usuarios.deleteAll();
        for (Perfil perfil : Perfil.values()) {
            Usuario u = usuarios.save(new Usuario(null, "U " + perfil, perfil.name().toLowerCase() + "@x.com", "hash", perfil, true));
            pessoas.put(perfil, u);
            tokens.put(perfil, jwtService.emitir(u).token());
        }
    }

    @Test
    void quemAbriuEAvisadoQuandoOChamadoEFinalizado() throws Exception {
        Chamado c = cicloCompleto(Perfil.OPERARIO);

        mvc.perform(como(Perfil.OPERARIO, get("/api/notificacoes")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.naoLidas").value(1))
                .andExpect(jsonPath("$.itens", hasSize(1)))
                .andExpect(jsonPath("$.itens[0].texto", containsString("Forno 02")))
                .andExpect(jsonPath("$.itens[0].texto", containsString("U ENGENHEIRO")))
                .andExpect(jsonPath("$.itens[0].link").value("/manutencao?chamado=" + c.getId()))
                .andExpect(jsonPath("$.itens[0].lida").value(false))
                .andExpect(jsonPath("$.itens[0].usuarioId").doesNotExist());

        mvc.perform(como(Perfil.ENGENHEIRO, get("/api/notificacoes"))).andExpect(jsonPath("$.naoLidas").value(0));
    }

    @Test
    void engenheiroQueAbriuEFinalizouNaoAvisaASiMesmo() throws Exception {
        cicloCompleto(Perfil.ENGENHEIRO);
        mvc.perform(como(Perfil.ENGENHEIRO, get("/api/notificacoes"))).andExpect(jsonPath("$.naoLidas").value(0));
    }

    @Test
    void marcaComoLidaSoAsSuas() throws Exception {
        cicloCompleto(Perfil.OPERARIO);
        String corpo = mvc.perform(como(Perfil.OPERARIO, get("/api/notificacoes"))).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(corpo, "$.itens[0].id");

        mvc.perform(como(Perfil.ENGENHEIRO, post("/api/notificacoes/" + id + "/lida"))).andExpect(status().isNotFound());
        mvc.perform(como(Perfil.OPERARIO, post("/api/notificacoes/" + id + "/lida"))).andExpect(status().isNoContent());

        mvc.perform(como(Perfil.OPERARIO, get("/api/notificacoes")))
                .andExpect(jsonPath("$.naoLidas").value(0))
                .andExpect(jsonPath("$.itens[0].lida").value(true));
    }

    @Test
    void marcaTodasComoLidasEMostraAs50MaisRecentes() throws Exception {
        Usuario operario = pessoas.get(Perfil.OPERARIO);
        for (int i = 0; i < 55; i++) {
            notificacoes.criar(operario.getId(), "Aviso " + i, "/manutencao");
        }
        notificacoes.criar(pessoas.get(Perfil.DIRETOR).getId(), "Do diretor", "/manutencao");

        mvc.perform(como(Perfil.OPERARIO, get("/api/notificacoes")))
                .andExpect(jsonPath("$.naoLidas").value(55))
                .andExpect(jsonPath("$.itens", hasSize(50)))
                .andExpect(jsonPath("$.itens[0].texto").value("Aviso 54"));

        mvc.perform(como(Perfil.OPERARIO, post("/api/notificacoes/lidas"))).andExpect(status().isNoContent());

        mvc.perform(como(Perfil.OPERARIO, get("/api/notificacoes"))).andExpect(jsonPath("$.naoLidas").value(0));
        mvc.perform(como(Perfil.DIRETOR, get("/api/notificacoes"))).andExpect(jsonPath("$.naoLidas").value(1));
    }

    @Test
    void avisaTodosOsEngenheirosAtivos() {
        Usuario inativo = usuarios.save(new Usuario(null, "Eng Inativo", "inativo@x.com", "hash", Perfil.ENGENHEIRO, false));
        Usuario outro = usuarios.save(new Usuario(null, "Outro Eng", "outro@x.com", "hash", Perfil.ENGENHEIRO, true));

        notificacoes.criarParaPerfil(Perfil.ENGENHEIRO, "Chamado automático", "/manutencao");

        assertThat(mongoTemplate.find(new Query(), Notificacao.class)).extracting(Notificacao::getUsuarioId)
                .containsExactlyInAnyOrder(pessoas.get(Perfil.ENGENHEIRO).getId(), outro.getId())
                .doesNotContain(inativo.getId());
    }

    @Test
    void adminNaoTemSinoENotificacoesExpiramEm30Dias() throws Exception {
        mvc.perform(como(Perfil.ADMIN, get("/api/notificacoes"))).andExpect(status().isForbidden());
        notificacoes.criar(pessoas.get(Perfil.OPERARIO).getId(), "x", "/manutencao");
        var indices = mongoTemplate.getCollection("notificacao").listIndexes().into(new ArrayList<Document>());
        assertThat(indices).anyMatch(i -> i.get("key", Document.class).containsKey("criadaEm")
                && i.get("expireAfterSeconds") instanceof Number s && s.longValue() == 30L * 24 * 3600);
    }

    private Chamado cicloCompleto(Perfil quemAbre) {
        Chamado c = chamados.abrir(new AbrirChamadoRequest(TipoChamado.MECANICO, forno.getId(), "Vazamento.", Prioridade.ALTA),
                pessoas.get(quemAbre));
        chamados.assumir(c.getId(), pessoas.get(Perfil.ENGENHEIRO));
        return chamados.finalizar(c.getId(), "Vedação trocada.", pessoas.get(Perfil.ENGENHEIRO));
    }

    private MockHttpServletRequestBuilder como(Perfil perfil, MockHttpServletRequestBuilder requisicao) {
        return requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokens.get(perfil));
    }
}
