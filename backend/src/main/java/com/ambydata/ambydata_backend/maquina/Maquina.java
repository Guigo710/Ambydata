package com.ambydata.ambydata_backend.maquina;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "maquina")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Maquina {

    @Id
    private String id;

    // Único sem diferenciar maiúsculas: índice com collation criado pela M002.
    private String nome;

    private TipoMaquina tipo;
    private String setor;
    private String linha;
    private int cadenciaIdeal;            // peças por minuto
    private FaixaTemperatura faixaTemperatura;
    private LimitesAlerta alertas;
    private double custoHora;             // R$
    private double valorPorPeca;          // R$
    private Turno turnoPlanejado;
    private boolean ativa = true;
    private CenarioSimulacao cenario = CenarioSimulacao.SAUDAVEL;
    // Desde quando a máquina existe na fábrica: os indicadores não inventam histórico antes
    // disso. Nulo nas máquinas da M002, que representam uma fábrica que já operava.
    private Instant emOperacaoDesde;
}
