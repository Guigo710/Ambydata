package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.maquina.FaixaTemperatura;

// NORMAL: dentro da faixa permitida (limites inclusive). ALERTA: fora da faixa, até o limite
// crítico. CRITICO: além do limite crítico (faixa + percentual da largura para cada lado).
public enum SituacaoTemperatura {
    NORMAL,
    ALERTA,
    CRITICO;

    public static SituacaoTemperatura de(double temperatura, FaixaTemperatura faixa, int percentualCritico) {
        FaixaTemperatura critica = faixa.critica(percentualCritico);
        if (temperatura < critica.min() || temperatura > critica.max()) {
            return CRITICO;
        }
        if (temperatura < faixa.min() || temperatura > faixa.max()) {
            return ALERTA;
        }
        return NORMAL;
    }
}
