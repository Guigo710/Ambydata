package com.ambydata.ambydata_backend.energia;

import com.ambydata.ambydata_backend.maquina.ParametrosEnergia;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

// Contas feitas à mão (SPEC-indicadores, "Custo de energia").
class CalculadoraEnergiaTests {

    private static final double ERRO = 1e-9;
    private static final TarifasEnergia TARIFAS = new TarifasEnergia(TarifasEnergia.ID, 0.85, 0.55, 150, 40, null, null);

    @Test
    void envasadoraEm15HorasOperando() {
        // 11 kW × 15 h = 165 kWh × R$ 0,85 = R$ 140,25
        // 3 kW × (15 h × 15%) = 3 × 2,25 = 6,75 kWh × R$ 0,55 = R$ 3,7125
        BalancoEnergia b = CalculadoraEnergia.calcular(15 * 3600, new ParametrosEnergia(11.0, 3.0, 15), TARIFAS);

        assertThat(b.horasOperando()).isCloseTo(15.0, within(ERRO));
        assertThat(b.consumoKwh()).isCloseTo(165.0, within(ERRO));
        assertThat(b.custoEntrada()).isCloseTo(140.25, within(ERRO));
        assertThat(b.horasRegeneracao()).isCloseTo(2.25, within(ERRO));
        assertThat(b.energiaInjetadaKwh()).isCloseTo(6.75, within(ERRO));
        assertThat(b.valorInjetado()).isCloseTo(3.7125, within(ERRO));
        assertThat(b.custoLiquido()).isCloseTo(136.5375, within(ERRO));
    }

    @Test
    void maquinaQueNaoRegeneraPagaTudo() {
        // 45 kW × 10 h = 450 kWh × R$ 0,85 = R$ 382,50
        BalancoEnergia b = CalculadoraEnergia.calcular(10 * 3600, new ParametrosEnergia(45.0, 0.0, 0), TARIFAS);

        assertThat(b.energiaInjetadaKwh()).isZero();
        assertThat(b.valorInjetado()).isZero();
        assertThat(b.custoLiquido()).isCloseTo(382.5, within(ERRO));
    }

    @Test
    void paradaOTempoTodoNaoConsome() {
        BalancoEnergia b = CalculadoraEnergia.calcular(0, new ParametrosEnergia(11.0, 3.0, 15), TARIFAS);
        assertThat(b.consumoKwh()).isZero();
        assertThat(b.custoLiquido()).isZero();
    }

    @Test
    void encargosDeDemandaProporcionaisAoPeriodo() {
        // 150 kW × R$ 40/kW·mês × 24 h ÷ 720 h = R$ 200; em 7 dias (168 h) = R$ 1.400
        assertThat(CalculadoraEnergia.encargosDemanda(TARIFAS, 24)).isCloseTo(200.0, within(ERRO));
        assertThat(CalculadoraEnergia.encargosDemanda(TARIFAS, 168)).isCloseTo(1400.0, within(ERRO));
    }

    @Test
    void somaDeMaquinas() {
        BalancoEnergia a = CalculadoraEnergia.calcular(15 * 3600, new ParametrosEnergia(11.0, 3.0, 15), TARIFAS);
        BalancoEnergia b = CalculadoraEnergia.calcular(10 * 3600, new ParametrosEnergia(45.0, 0.0, 0), TARIFAS);

        SomaEnergia soma = SomaEnergia.ZERO.mais(a).mais(b);

        assertThat(soma.consumoKwh()).isCloseTo(615.0, within(ERRO));
        assertThat(soma.custoEntrada()).isCloseTo(522.75, within(ERRO));
        assertThat(soma.energiaInjetadaKwh()).isCloseTo(6.75, within(ERRO));
        assertThat(soma.valorInjetado()).isCloseTo(3.7125, within(ERRO));
        assertThat(soma.custoLiquido()).isCloseTo(519.0375, within(ERRO));
    }
}
