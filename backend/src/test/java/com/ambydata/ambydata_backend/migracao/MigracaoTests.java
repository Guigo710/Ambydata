package com.ambydata.ambydata_backend.migracao;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfig.class)
class MigracaoTests {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private M001PerfilEIndices m001;

    @BeforeEach
    void limpar() {
        mongoTemplate.dropCollection("usuario");
        mongoTemplate.dropCollection(ExecutorMigracoes.COLECAO);
    }

    @Test
    void executorAplicaCadaMigracaoUmaVezSo() throws Exception {
        AtomicInteger execucoes = new AtomicInteger();
        Migracao contadora = new Migracao() {
            public String id() { return "999-teste"; }
            public void aplicar(MongoTemplate template) { execucoes.incrementAndGet(); }
        };
        ExecutorMigracoes executor = new ExecutorMigracoes(mongoTemplate, List.of(contadora));

        executor.run(null);
        executor.run(null);

        assertThat(execucoes).hasValue(1);
        assertThat(mongoTemplate.getCollection(ExecutorMigracoes.COLECAO)
                .countDocuments(new Document("_id", "999-teste"))).isEqualTo(1);
    }

    @Test
    void executorAplicaEmOrdemDeId() throws Exception {
        StringBuilder ordem = new StringBuilder();
        Migracao segunda = migracao("002-b", () -> ordem.append("b"));
        Migracao primeira = migracao("001-a", () -> ordem.append("a"));

        new ExecutorMigracoes(mongoTemplate, List.of(segunda, primeira)).run(null);

        assertThat(ordem).hasToString("ab");
    }

    @Test
    void m001ConverteCargoEmPerfil() {
        var usuarios = mongoTemplate.getCollection("usuario");
        usuarios.insertOne(new Document("email", "diretor@x.com").append("cargo", "diretor"));
        usuarios.insertOne(new Document("email", "operario@x.com").append("cargo", "OPERARIO"));
        usuarios.insertOne(new Document("email", "estranho@x.com").append("cargo", "suporte"));
        usuarios.insertOne(new Document("email", "novo@x.com").append("perfil", "ADMIN"));

        m001.aplicar(mongoTemplate);

        assertThat(perfilDe("diretor@x.com")).isEqualTo("DIRETOR");
        assertThat(perfilDe("operario@x.com")).isEqualTo("OPERARIO");
        assertThat(perfilDe("estranho@x.com")).isEqualTo("OPERARIO");
        assertThat(perfilDe("novo@x.com")).isEqualTo("ADMIN");
        assertThat(usuarios.countDocuments(new Document("cargo", new Document("$exists", true)))).isZero();
    }

    @Test
    void m001CriaIndiceUnicoDeEmail() {
        m001.aplicar(mongoTemplate);

        boolean temIndiceUnico = mongoTemplate.getCollection("usuario").listIndexes().into(new java.util.ArrayList<>())
                .stream()
                .anyMatch(i -> i.get("key", Document.class).containsKey("email") && Boolean.TRUE.equals(i.getBoolean("unique")));
        assertThat(temIndiceUnico).isTrue();
    }

    private String perfilDe(String email) {
        Document doc = mongoTemplate.getCollection("usuario").find(new Document("email", email)).first();
        return doc == null ? null : doc.getString("perfil");
    }

    private static Migracao migracao(String id, Runnable acao) {
        return new Migracao() {
            public String id() { return id; }
            public void aplicar(MongoTemplate template) { acao.run(); }
        };
    }
}
