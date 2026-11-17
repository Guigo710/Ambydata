package com.ambydata.ambydata_backend.notificacao;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

// Aviso no sino de um usuário (SPEC-chamados, "Notificações"). Apagado sozinho após 30 dias.
@Document(collection = "notificacao")
@CompoundIndex(name = "usuario_criacao", def = "{'usuarioId': 1, 'criadaEm': -1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Notificacao {

    @Id
    private String id;
    @JsonIgnore
    private String usuarioId;
    private String texto;
    private String link;                  // rota do frontend, ex.: /manutencao?chamado=<id>
    private boolean lida;
    @Indexed(name = "expira_em_30d", expireAfter = "30d")
    private Instant criadaEm;
}
