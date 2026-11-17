package com.ambydata.ambydata_backend.indicadores;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

// Totais de uma máquina numa hora fechada (`_id` = <maquinaId>:<epoch/3600>), base do
// histórico de 24 h e 7 dias. Apagados sozinhos após 90 dias.
@Document(collection = "indicador_hora")
@CompoundIndex(name = "maquina_hora", def = "{'maquinaId': 1, 'hora': -1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class IndicadorHora {

    @Id
    private String id;

    private String maquinaId;

    @Indexed(name = "expira_em_90d", expireAfter = "90d")
    private Instant hora;                 // início da hora

    private FonteAgregado fonte;
    private int leituras;
    private long segundosPlanejados;
    private long segundosOperando;
    private long segundosParado;
    private int paradas;
    private int pecasProduzidas;
    private int pecasBoas;
    private boolean comecaParada;         // a hora abre com a máquina parada
    private boolean terminaParada;        // e fecha parada (a parada continua na hora seguinte)
    private double temperaturaMedia;
    private double temperaturaMinima;
    private double temperaturaMaxima;

    public static String idDe(String maquinaId, Instant hora) {
        return maquinaId + ":" + Math.floorDiv(hora.getEpochSecond(), 3600);
    }

    public Totais totais() {
        return new Totais(segundosPlanejados, segundosOperando, segundosParado, paradas, pecasProduzidas, pecasBoas,
                comecaParada, terminaParada);
    }
}
