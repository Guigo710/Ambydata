package com.ambydata.ambydata_backend.migracao;

import com.ambydata.ambydata_backend.usuario.Perfil;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.AggregationUpdate;
import org.springframework.data.mongodb.core.aggregation.StringOperators;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.util.Arrays;

// Troca o antigo campo "cargo" (texto) pelo "perfil" (enum Perfil) e garante o
// índice único de e-mail. Cargos desconhecidos viram OPERARIO, o perfil mais restrito.
@Component
public class M001PerfilEIndices implements Migracao {

    private static final String COLECAO = "usuario";

    @Override
    public String id() {
        return "001-perfil-e-indices";
    }

    @Override
    public void aplicar(MongoTemplate mongoTemplate) {
        mongoTemplate.updateMulti(
                Query.query(Criteria.where("cargo").exists(true)),
                AggregationUpdate.update()
                        .set("perfil").toValue(StringOperators.valueOf("cargo").toUpper())
                        .unset("cargo"),
                COLECAO);

        var perfisValidos = Arrays.stream(Perfil.values()).map(Enum::name).toList();
        mongoTemplate.updateMulti(
                Query.query(Criteria.where("perfil").nin(perfisValidos)),
                Update.update("perfil", Perfil.OPERARIO.name()),
                COLECAO);

        // Mesmo nome que o @Indexed de Usuario gera ("email"), para não conflitar com ele.
        mongoTemplate.indexOps(COLECAO).createIndex(new Index("email", Sort.Direction.ASC).unique().named("email"));
    }
}
