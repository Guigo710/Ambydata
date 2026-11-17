package com.ambydata.ambydata_backend.energia;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

// Tarifas de energia da fábrica (um documento só, `_id` = "fabrica"): o ENGENHEIRO ajusta no
// painel Energia. Valores em R$/kWh, kW e R$/kW por mês.
@Document(collection = "configuracao_energia")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TarifasEnergia {

    public static final String ID = "fabrica";

    @Id
    private String id;
    private double tarifaCheia;           // TE + TUSD, R$/kWh
    private double tarifaCompensavel;     // crédito da energia injetada, R$/kWh
    private double demandaContratadaKw;
    private double tarifaDemanda;         // R$ por kW por mês
    private Instant atualizadoEm;
    private String atualizadoPor;         // nome de quem alterou por último (nulo nos valores iniciais)
}
