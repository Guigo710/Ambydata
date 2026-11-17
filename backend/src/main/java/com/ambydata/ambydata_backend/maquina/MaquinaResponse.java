package com.ambydata.ambydata_backend.maquina;

import com.fasterxml.jackson.annotation.JsonInclude;

// Máquina como a API devolve, já com a faixa crítica calculada a partir do percentual.
// Custo-hora, valor por peça e energia são dados de gestão: com eles e as horas, qualquer um
// refaria o financeiro (só DIRETOR). `publica` tira os três; quem recebe é o OPERARIO e todas
// as respostas de /api/indicadores.
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MaquinaResponse(
        String id, String nome, TipoMaquina tipo, String setor, String linha, int cadenciaIdeal,
        FaixaTemperatura faixaTemperatura, LimitesAlerta alertas, FaixaTemperatura limiteCritico,
        Double custoHora, Double valorPorPeca, Turno turnoPlanejado, boolean ativa, ParametrosEnergia energia) {

    public static MaquinaResponse de(Maquina m) {
        return new MaquinaResponse(m.getId(), m.getNome(), m.getTipo(), m.getSetor(), m.getLinha(),
                m.getCadenciaIdeal(), m.getFaixaTemperatura(), m.getAlertas(),
                m.getFaixaTemperatura().critica(m.getAlertas().percentualCritico()),
                m.getCustoHora(), m.getValorPorPeca(), m.getTurnoPlanejado(), m.isAtiva(), m.getEnergia());
    }

    public static MaquinaResponse publica(Maquina m) {
        MaquinaResponse completa = de(m);
        return new MaquinaResponse(completa.id(), completa.nome(), completa.tipo(), completa.setor(), completa.linha(),
                completa.cadenciaIdeal(), completa.faixaTemperatura(), completa.alertas(), completa.limiteCritico(),
                null, null, completa.turnoPlanejado(), completa.ativa(), null);
    }
}
