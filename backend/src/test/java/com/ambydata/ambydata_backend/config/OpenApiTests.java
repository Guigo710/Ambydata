package com.ambydata.ambydata_backend.config;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class OpenApiTests {

    @Autowired
    private MockMvc mvc;

    @Test
    void documentacaoEPublicaEListaAsRotasDoContrato() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/auth/login'].post").exists())
                .andExpect(jsonPath("$.paths['/api/auth/me'].get").exists())
                .andExpect(jsonPath("$.paths['/api/auth/me/senha'].put").exists())
                .andExpect(jsonPath("$.paths['/api/usuarios'].get").exists())
                .andExpect(jsonPath("$.paths['/api/usuarios'].post").exists())
                .andExpect(jsonPath("$.paths['/api/usuarios/{id}'].put").exists())
                .andExpect(jsonPath("$.paths['/api/usuarios/{id}/ativo'].patch").exists())
                .andExpect(jsonPath("$.paths['/api/usuarios/{id}/senha'].put").exists());
    }

    @Test
    void declaraOTokenBearerParaOBotaoAuthorize() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.components.securitySchemes.bearer.type").value("http"))
                .andExpect(jsonPath("$.components.securitySchemes.bearer.scheme").value("bearer"))
                .andExpect(jsonPath("$.security[0].bearer").exists());
    }

    @Test
    void paginaDoSwaggerEPublica() throws Exception {
        mvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk());
    }

    @Test
    void enderecoDaSpecLevaAoSwagger() throws Exception {
        mvc.perform(get("/swagger-ui"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    void loginNaoExigeTokenNaDocumentacao() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.paths['/api/auth/login'].post.security").isEmpty());
    }
}
