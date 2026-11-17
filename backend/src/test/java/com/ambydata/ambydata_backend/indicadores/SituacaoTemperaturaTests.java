package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.maquina.FaixaTemperatura;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SituacaoTemperaturaTests {

    // Faixa 160–200 °C com 50% → crítico abaixo de 140 ou acima de 220.
    private static final FaixaTemperatura FAIXA = new FaixaTemperatura(160.0, 200.0);

    @Test
    void dentroDaFaixaENormalForaEAlertaAlemDoLimiteECritico() {
        assertThat(SituacaoTemperatura.de(180, FAIXA, 50)).isEqualTo(SituacaoTemperatura.NORMAL);
        assertThat(SituacaoTemperatura.de(200, FAIXA, 50)).isEqualTo(SituacaoTemperatura.NORMAL);
        assertThat(SituacaoTemperatura.de(205, FAIXA, 50)).isEqualTo(SituacaoTemperatura.ALERTA);
        assertThat(SituacaoTemperatura.de(159, FAIXA, 50)).isEqualTo(SituacaoTemperatura.ALERTA);
        assertThat(SituacaoTemperatura.de(220, FAIXA, 50)).isEqualTo(SituacaoTemperatura.ALERTA);
        assertThat(SituacaoTemperatura.de(220.1, FAIXA, 50)).isEqualTo(SituacaoTemperatura.CRITICO);
        assertThat(SituacaoTemperatura.de(139, FAIXA, 50)).isEqualTo(SituacaoTemperatura.CRITICO);
    }
}
