package com.ambydata.ambydata_backend.simulacao;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.migracao.M002MaquinasIniciais;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
@TestPropertySource(properties = "app.dispositivo.chave=chave-do-esp32-de-teste-0123456789")
class IngestaoDispositivoTests {

    private static final String CHAVE = "chave-do-esp32-de-teste-0123456789";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private M002MaquinasIniciais m002;

    private String forno;

    @BeforeEach
    void preparar() {
        mongoTemplate.dropCollection(Maquina.class);
        m002.aplicar(mongoTemplate);
        mongoTemplate.remove(new Query(), Leitura.class);
        forno = mongoTemplate.findOne(Query.query(Criteria.where("nome").is("Forno 02")), Maquina.class).getId();
    }

    @Test
    void semChaveOuComChaveErradaDevolve401() throws Exception {
        mvc.perform(leitura(null, forno, 5, 5)).andExpect(status().isUnauthorized());
        mvc.perform(leitura("chave-errada", forno, 5, 5)).andExpect(status().isUnauthorized());
        assertThat(mongoTemplate.count(new Query(), Leitura.class)).isZero();
    }

    @Test
    void comAChaveCertaGravaComoDispositivo() throws Exception {
        mvc.perform(leitura(CHAVE, forno, 5, 4))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.origem").value("DISPOSITIVO"))
                .andExpect(jsonPath("$.maquinaId").value(forno));

        Leitura gravada = mongoTemplate.findOne(new Query(), Leitura.class);
        assertThat(gravada.getOrigem()).isEqualTo(OrigemLeitura.DISPOSITIVO);
        assertThat(gravada.getTemperatura()).isEqualTo(185.5);
        assertThat(gravada.getInstante()).isNotNull();
    }

    @Test
    void maquinaInexistenteDevolve404() throws Exception {
        mvc.perform(leitura(CHAVE, "nao-existe", 5, 5)).andExpect(status().isNotFound());
    }

    @Test
    void pecasBoasNaoPodemPassarDasProduzidas() throws Exception {
        mvc.perform(leitura(CHAVE, forno, 3, 5))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.pecasBoas").isNotEmpty());
    }

    private static MockHttpServletRequestBuilder leitura(String chave, String maquinaId, int produzidas, int boas) {
        MockHttpServletRequestBuilder requisicao = post("/api/leituras").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"maquinaId":"%s","status":"OPERANDO","temperatura":185.5,
                         "pecasProduzidas":%d,"pecasBoas":%d,"segundosParado":0}
                        """.formatted(maquinaId, produzidas, boas));
        return chave == null ? requisicao : requisicao.header("X-Device-Key", chave);
    }
}
