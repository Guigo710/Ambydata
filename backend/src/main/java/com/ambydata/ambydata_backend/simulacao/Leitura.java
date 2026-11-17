package com.ambydata.ambydata_backend.simulacao;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

// O que a máquina mediu em um bloco de 10 s. O id "<maquinaId>:<bloco>" torna a gravação
// idempotente: gravar o mesmo instante duas vezes não duplica. Some depois de 48 h (TTL).
@Document(collection = "leitura")
@CompoundIndex(name = "maquina_instante", def = "{'maquinaId': 1, 'instante': -1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@ToString
public class Leitura {

    @Id
    private String id;

    private String maquinaId;

    @Indexed(name = "expira_em_48h", expireAfter = "48h")
    private Instant instante;

    private StatusMaquina status;
    private double temperatura;       // °C
    private int pecasProduzidas;      // no bloco de 10 s
    private int pecasBoas;
    private int segundosParado;       // 0 ou 10
    private OrigemLeitura origem;

    public static String idDe(String maquinaId, Instant instante) {
        return maquinaId + ":" + Math.floorDiv(instante.getEpochSecond(), 10);
    }
}
