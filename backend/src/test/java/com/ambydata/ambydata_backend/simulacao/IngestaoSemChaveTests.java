package com.ambydata.ambydata_backend.simulacao;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Sem DEVICE_KEY (o padrão), a ingestão fica desligada: nenhuma chave é aceita, nem a vazia.
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
@TestPropertySource(properties = "app.dispositivo.chave=")
class IngestaoSemChaveTests {

    @Autowired
    private MockMvc mvc;

    @Test
    void semChaveConfiguradaTudoDevolve401() throws Exception {
        String corpo = """
                {"maquinaId":"x","status":"OPERANDO","temperatura":20,"pecasProduzidas":1,"pecasBoas":1,"segundosParado":0}
                """;
        mvc.perform(post("/api/leituras").contentType(MediaType.APPLICATION_JSON).content(corpo).header("X-Device-Key", ""))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/leituras").contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void chaveCurtaImpedeASubida() {
        assertThatThrownBy(() -> new DispositivoProperties("1234")).isInstanceOf(IllegalArgumentException.class);
    }
}
