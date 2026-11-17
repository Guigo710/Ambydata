package com.ambydata.ambydata_backend.maquina;

// Máquina como a API devolve, já com a faixa crítica calculada a partir do percentual.
public record MaquinaResponse(
        String id, String nome, TipoMaquina tipo, String setor, String linha, int cadenciaIdeal,
        FaixaTemperatura faixaTemperatura, LimitesAlerta alertas, FaixaTemperatura limiteCritico,
        double custoHora, double valorPorPeca, Turno turnoPlanejado, boolean ativa) {

    public static MaquinaResponse de(Maquina m) {
        return new MaquinaResponse(m.getId(), m.getNome(), m.getTipo(), m.getSetor(), m.getLinha(),
                m.getCadenciaIdeal(), m.getFaixaTemperatura(), m.getAlertas(),
                m.getFaixaTemperatura().critica(m.getAlertas().percentualCritico()),
                m.getCustoHora(), m.getValorPorPeca(), m.getTurnoPlanejado(), m.isAtiva());
    }
}
