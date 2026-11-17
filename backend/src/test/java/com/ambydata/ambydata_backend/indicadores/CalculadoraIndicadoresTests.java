package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.simulacao.Leitura;
import com.ambydata.ambydata_backend.simulacao.OrigemLeitura;
import com.ambydata.ambydata_backend.simulacao.StatusMaquina;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

// Os valores esperados foram calculados à mão (SPEC-indicadores, critério 1).
class CalculadoraIndicadoresTests {

    private static final double ERRO = 1e-9;

    // Uma hora de turno: 50 min operando, 10 min parada em 2 paradas; cadência 60/min.
    // Ideal no tempo operando = 60 × 50 = 3000 peças; produziu 2700; 2430 boas.
    private static final Totais HORA = new Totais(3600, 3000, 600, 2, 2700, 2430);

    @Test
    void disponibilidadePerformanceQualidadeEOeeDeUmaHora() {
        Indicadores i = CalculadoraIndicadores.calcular(HORA, 60);

        assertThat(i.disponibilidade()).isCloseTo(50.0 / 60, within(ERRO)); // 50 min ÷ 60 min
        assertThat(i.performance()).isCloseTo(0.9, within(ERRO));           // 2700 ÷ 3000
        assertThat(i.qualidade()).isCloseTo(0.9, within(ERRO));             // 2430 ÷ 2700
        assertThat(i.oee()).isCloseTo(0.675, within(ERRO));                 // 0,8333 × 0,9 × 0,9
        assertThat(i.mtbfMinutos()).isCloseTo(25.0, within(ERRO));          // 50 min ÷ 2 paradas
        assertThat(i.downtimeMinutos()).isCloseTo(10.0, within(ERRO));
        assertThat(i.pecasPorHora()).isCloseTo(2700.0, within(ERRO));       // 2700 peças em 1 h planejada
    }

    @Test
    void financeiroDeUmaHora() {
        // custo-hora R$ 120 × 1 h planejada; 2430 boas × R$ 2.
        Financeiro f = CalculadoraIndicadores.financeiro(HORA, 120, 2);

        assertThat(f.custo()).isCloseTo(120.0, within(ERRO));
        assertThat(f.receita()).isCloseTo(4860.0, within(ERRO));
        assertThat(f.lucro()).isCloseTo(4740.0, within(ERRO));
    }

    @Test
    void totaisSaemDasLeiturasIgnorandoForaDoTurno() {
        List<Leitura> leituras = new ArrayList<>();
        Instant t = Instant.parse("2026-11-10T13:00:00Z");
        // 150 operando, 30 parada, 150 operando, 30 parada, 20 fora do turno (não contam).
        // Peças: 270 blocos com 9 produzidas/8 boas e 30 com 9/9 → 2700 produzidas, 2430 boas.
        int operando = 0;
        for (int bloco = 0; bloco < 380; bloco++, t = t.plusSeconds(10)) {
            if (bloco >= 360) {
                leituras.add(leitura(t, StatusMaquina.FORA_DO_TURNO, 0, 0));
            } else if ((bloco >= 150 && bloco < 180) || bloco >= 330) {
                leituras.add(leitura(t, StatusMaquina.PARADA, 0, 0));
            } else {
                leituras.add(leitura(t, StatusMaquina.OPERANDO, 9, operando++ < 270 ? 8 : 9));
            }
        }
        Collections.shuffle(leituras, new java.util.Random(7)); // a ordem de chegada não importa

        // Não termina parada: depois da última parada vêm leituras fora do turno.
        assertThat(Totais.de(leituras)).isEqualTo(HORA);
    }

    @Test
    void paradaQueAtravessaAViradaDaHoraContaUmaVezNaSoma() {
        Instant t = Instant.parse("2026-11-10T13:59:40Z");
        Leitura a = leitura(t, StatusMaquina.OPERANDO, 9, 9);
        Leitura b = leitura(t.plusSeconds(10), StatusMaquina.PARADA, 0, 0);   // 13:59:50
        Leitura c = leitura(t.plusSeconds(20), StatusMaquina.PARADA, 0, 0);   // 14:00:00
        Leitura d = leitura(t.plusSeconds(30), StatusMaquina.OPERANDO, 9, 9);

        Totais umaHora = Totais.de(List.of(a, b));
        Totais outraHora = Totais.de(List.of(c, d));

        assertThat(umaHora.paradas() + outraHora.paradas()).isEqualTo(2);
        assertThat(umaHora.somar(outraHora)).isEqualTo(Totais.de(List.of(a, b, c, d)));
        assertThat(umaHora.somar(outraHora).paradas()).isEqualTo(1);
        assertThat(Totais.VAZIO.somar(umaHora)).isEqualTo(umaHora);
    }

    @Test
    void paradaQueComecaNoInicioDaJanelaContaComoUmaParada() {
        Instant t = Instant.parse("2026-11-10T13:00:00Z");
        List<Leitura> leituras = List.of(
                leitura(t, StatusMaquina.PARADA, 0, 0),
                leitura(t.plusSeconds(10), StatusMaquina.PARADA, 0, 0),
                leitura(t.plusSeconds(20), StatusMaquina.OPERANDO, 9, 9));

        assertThat(Totais.de(leituras).paradas()).isEqualTo(1);
    }

    @Test
    void foraDoTurnoNaoTemIndicadores() {
        Indicadores i = CalculadoraIndicadores.calcular(Totais.VAZIO, 60);

        assertThat(i.disponibilidade()).isNull();
        assertThat(i.performance()).isNull();
        assertThat(i.qualidade()).isNull();
        assertThat(i.oee()).isNull();
        assertThat(i.mtbfMinutos()).isNull();
        assertThat(i.pecasPorHora()).isNull();
        assertThat(CalculadoraIndicadores.financeiro(Totais.VAZIO, 120, 2).lucro()).isZero();
    }

    @Test
    void paradaOTurnoTodoTemOeeZeroSemPerformanceNemQualidade() {
        Indicadores i = CalculadoraIndicadores.calcular(new Totais(3600, 0, 3600, 1, 0, 0), 60);

        assertThat(i.disponibilidade()).isZero();
        assertThat(i.performance()).isNull(); // sem tempo operando, não há o que medir
        assertThat(i.qualidade()).isNull();
        assertThat(i.oee()).isZero();
        assertThat(i.mtbfMinutos()).isZero();
        assertThat(CalculadoraIndicadores.financeiro(new Totais(3600, 0, 3600, 1, 0, 0), 120, 2).lucro())
                .isCloseTo(-120.0, within(ERRO));
    }

    @Test
    void operandoSemProduzirTemOeeZero() {
        // Máquina travada marcando OPERANDO: P = 0 e Q não tem base, mas o OEE é 0, não "—".
        Indicadores i = CalculadoraIndicadores.calcular(new Totais(3600, 3600, 0, 0, 0, 0), 60);

        assertThat(i.performance()).isZero();
        assertThat(i.qualidade()).isNull();
        assertThat(i.oee()).isZero();
    }

    @Test
    void lacunaEntreHorasQuebraAParada() {
        Totais terminaParada = new Totais(3600, 3000, 600, 1, 2700, 2430, false, true);
        Totais comecaParada = new Totais(3600, 3000, 600, 1, 2700, 2430, true, false);

        assertThat(terminaParada.somar(comecaParada).paradas()).isEqualTo(1);           // horas seguidas
        assertThat(terminaParada.semBordaFinal().somar(comecaParada).paradas()).isEqualTo(2); // hora sem dados no meio
    }

    @Test
    void semParadasNaoHaMtbf() {
        Indicadores i = CalculadoraIndicadores.calcular(new Totais(600, 600, 0, 0, 540, 540), 60);

        assertThat(i.mtbfMinutos()).isNull();
        assertThat(i.disponibilidade()).isEqualTo(1.0);
    }

    @Test
    void totaisSeSomam() {
        Totais duas = HORA.somar(HORA);

        assertThat(duas).isEqualTo(new Totais(7200, 6000, 1200, 4, 5400, 4860));
        assertThat(CalculadoraIndicadores.calcular(duas, 60).oee()).isCloseTo(0.675, within(ERRO));
    }

    @Test
    void grupoDeMaquinasUsaASomaDasPecasIdeaisDeCada() {
        // Máquina A: 60/min, 50 min operando → ideal 3000; B: 30/min, 40 min → ideal 1200.
        Totais a = new Totais(3600, 3000, 600, 2, 2700, 2430, false, true);
        Totais b = new Totais(3600, 2400, 1200, 3, 1080, 1000, true, false);
        Totais grupo = a.juntar(b);

        assertThat(grupo).isEqualTo(new Totais(7200, 5400, 1800, 5, 3780, 3430)); // paradas de máquinas diferentes somam
        Indicadores i = CalculadoraIndicadores.calcularComIdeal(grupo, 3000 + 1200);
        assertThat(i.performance()).isCloseTo(3780.0 / 4200, within(ERRO));
        assertThat(i.disponibilidade()).isCloseTo(0.75, within(ERRO));
        assertThat(CalculadoraIndicadores.pecasIdeais(a, 60)).isCloseTo(3000.0, within(ERRO));
    }

    private static Leitura leitura(Instant t, StatusMaquina status, int produzidas, int boas) {
        return new Leitura("m1:" + t.getEpochSecond() / 10, "m1", t, status, 20.0, produzidas, boas,
                status == StatusMaquina.PARADA ? 10 : 0, OrigemLeitura.SIMULADOR);
    }
}
