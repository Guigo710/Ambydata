package com.ambydata.ambydata_backend.chamado;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

// Chamado de manutenção (SPEC-chamados). Nome, setor e linha da máquina são copiados na
// abertura: o card continua contando o que era quando foi aberto.
@Document(collection = "chamado")
@CompoundIndex(name = "status_abertura", def = "{'status': 1, 'abertoEm': -1}")
@CompoundIndex(name = "maquina_status", def = "{'maquinaId': 1, 'status': 1}")
@Getter
@Setter
@NoArgsConstructor
public class Chamado {

    @Id
    private String id;
    private TipoChamado tipo;
    private String maquinaId;
    private String maquinaNome;
    private String setor;
    private String linha;
    private String descricao;
    private Prioridade prioridade;
    private StatusChamado status;
    private PessoaChamado abertoPor;
    private PessoaChamado responsavel;
    private Instant abertoEm;
    private Instant assumidoEm;
    private Instant finalizadoEm;
    private Instant canceladoEm;
    private String solucao;
    private String motivoCancelamento;
    private List<EventoChamado> historico;
}
