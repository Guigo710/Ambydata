package com.ambydata.ambydata_backend.migracao;

import org.springframework.data.mongodb.core.MongoTemplate;

// Uma mudança de estrutura ou de dados do banco. O ExecutorMigracoes aplica cada
// uma no máximo uma vez, em ordem de id ("001-...", "002-..."). Nunca mude o id
// nem o comportamento de uma migração já publicada: crie uma nova.
public interface Migracao {

    String id();

    void aplicar(MongoTemplate mongoTemplate);
}
