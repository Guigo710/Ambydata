package com.ambydata.ambydata_backend.simulacao;

import com.ambydata.ambydata_backend.maquina.CenarioSimulacao;
import com.ambydata.ambydata_backend.maquina.FaixaTemperatura;
import com.ambydata.ambydata_backend.maquina.LimitesAlerta;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.TipoMaquina;
import com.ambydata.ambydata_backend.maquina.Turno;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GeradorLeiturasTests {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private final GeradorLeituras gerador = new GeradorLeituras(FUSO);

    // Um dia inteiro de turno (06:00–22:00) num dia qualquer, a cada 10 s.
    private static final Instant INICIO_TURNO = ZonedDateTime.of(2026, 11, 10, 6, 0, 0, 0, FUSO).toInstant();
    private static final int BLOCOS_NO_TURNO = 16 * 60 * 6;

    @Test
    void mesmoInstanteGeraSempreAMesmaLeitura() {
        Maquina m = maquina("m1", CenarioSimulacao.SAUDAVEL);
        Instant t = INICIO_TURNO.plusSeconds(3_607);

        Leitura a = gerador.gerar(m, t);
        Leitura b = new GeradorLeituras(FUSO).gerar(m, t);

        assertThat(a).isEqualTo(b);
        assertThat(a.getId()).isEqualTo("m1:" + (t.getEpochSecond() / 10));
        assertThat(a.getInstante().getEpochSecond() % 10).isZero();
        assertThat(a.getOrigem()).isEqualTo(OrigemLeitura.SIMULADOR);
    }

    @Test
    void maquinasDiferentesNoMesmoInstanteGeramLeiturasDiferentes() {
        Instant t = INICIO_TURNO.plusSeconds(600);
        List<Double> temperaturas = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            temperaturas.add(gerador.gerar(maquina("m" + i, CenarioSimulacao.SAUDAVEL), t).getTemperatura());
        }
        assertThat(temperaturas).doesNotHaveDuplicates();
    }

    @Test
    void foraDoTurnoAMaquinaNaoProduzNemContaParada() {
        Leitura madrugada = gerador.gerar(maquina("m1", CenarioSimulacao.SAUDAVEL),
                ZonedDateTime.of(2026, 11, 10, 3, 0, 0, 0, FUSO).toInstant());

        assertThat(madrugada.getStatus()).isEqualTo(StatusMaquina.FORA_DO_TURNO);
        assertThat(madrugada.getPecasProduzidas()).isZero();
        assertThat(madrugada.getSegundosParado()).isZero();
    }

    @Test
    void producaoRespeitaACadenciaEBoasNuncaPassamDasProduzidas() {
        Maquina m = maquina("m1", CenarioSimulacao.SAUDAVEL); // 60 peças/min = 10 a cada 10 s
        for (Leitura l : dia(m)) {
            assertThat(l.getPecasProduzidas()).isBetween(0, 12);
            assertThat(l.getPecasBoas()).isBetween(0, l.getPecasProduzidas());
            if (l.getStatus() == StatusMaquina.PARADA) {
                assertThat(l.getPecasProduzidas()).isZero();
                assertThat(l.getSegundosParado()).isEqualTo(10);
            }
        }
    }

    @Test
    void saudavelTemDisponibilidadeAltaETemperaturaNaFaixa() {
        Maquina m = maquina("saudavel", CenarioSimulacao.SAUDAVEL);
        List<Leitura> dia = dia(m);
        assertThat(disponibilidade(dia)).isGreaterThan(0.9);
        assertThat(qualidade(dia)).isGreaterThan(0.97);
        assertThat(dia).allMatch(l -> l.getTemperatura() >= 10 && l.getTemperatura() <= 30);
    }

    // Os critérios da SPEC-simulacao valem para qualquer id de máquina, não só para um id de sorte:
    // a média de vários ids precisa cair na faixa, e nenhum id pode fugir muito dela.
    private static final List<String> IDS = List.of("6745a1f0c2e4b81d9a3f0011", "6745a1f0c2e4b81d9a3f0012",
            "6745a1f0c2e4b81d9a3f0013", "6745a1f0c2e4b81d9a3f0014", "6745a1f0c2e4b81d9a3f0015",
            "6745a1f0c2e4b81d9a3f0016", "6745a1f0c2e4b81d9a3f0017", "6745a1f0c2e4b81d9a3f0018");

    @Test
    void saudavelFicaPertoDe85PorCentoDeOee() {
        assertThat(media(IDS, id -> oee(dia(maquina(id, CenarioSimulacao.SAUDAVEL))))).isBetween(0.82, 0.88);
    }

    @Test
    void paradasFrequentesFicamPertoDe55PorCentoDeOeeComDisponibilidadeBaixa() {
        assertThat(media(IDS, id -> oee(dia(maquina(id, CenarioSimulacao.PARADAS_FREQUENTES))))).isBetween(0.50, 0.60);
        for (String id : IDS) {
            assertThat(disponibilidade(dia(maquina(id, CenarioSimulacao.PARADAS_FREQUENTES)))).as(id).isLessThan(0.75);
        }
        assertThat(media(IDS, id -> disponibilidade(dia(maquina(id, CenarioSimulacao.PARADAS_FREQUENTES))))).isLessThan(0.70);
    }

    @Test
    void defeitosAltosFicamPertoDe88PorCentoDeQualidade() {
        assertThat(media(IDS, id -> qualidade(dia(maquina(id, CenarioSimulacao.DEFEITOS_ALTOS))))).isBetween(0.86, 0.90);
    }

    @Test
    void aquecimentoPassaDoLimiteCriticoEVoltaDepoisDaManutencao() {
        Maquina forno = maquina("forno", CenarioSimulacao.AQUECIMENTO); // faixa 10–30, crítico acima de 40
        List<Leitura> dia = dia(forno);
        assertThat(dia).anyMatch(l -> l.getTemperatura() > 40);
        assertThat(dia).anyMatch(l -> l.getTemperatura() < 30);
    }

    @Test
    void oscilacaoSaiDaFaixaMasNaoChegaAoCritico() {
        List<Leitura> dia = dia(maquina("resfriador", CenarioSimulacao.OSCILACAO)); // faixa 10–30, crítico 0–40
        assertThat(dia).anyMatch(l -> l.getTemperatura() > 30 || l.getTemperatura() < 10);
        assertThat(dia).allMatch(l -> l.getTemperatura() > 0 && l.getTemperatura() < 40);
    }

    private List<Leitura> dia(Maquina m) {
        List<Leitura> leituras = new ArrayList<>(BLOCOS_NO_TURNO);
        for (int i = 0; i < BLOCOS_NO_TURNO; i++) {
            leituras.add(gerador.gerar(m, INICIO_TURNO.plusSeconds(i * 10L)));
        }
        return leituras;
    }

    private static double disponibilidade(List<Leitura> leituras) {
        return leituras.stream().filter(l -> l.getStatus() == StatusMaquina.OPERANDO).count() / (double) leituras.size();
    }

    // OEE = peças boas / peças que a cadência ideal faria no tempo de turno (60/min = 10 por bloco).
    private static double oee(List<Leitura> leituras) {
        int boas = leituras.stream().mapToInt(Leitura::getPecasBoas).sum();
        return boas / (leituras.size() * 10.0);
    }

    private static double media(List<String> ids, java.util.function.ToDoubleFunction<String> valor) {
        return ids.stream().mapToDouble(valor).average().orElseThrow();
    }

    private static double qualidade(List<Leitura> leituras) {
        int produzidas = leituras.stream().mapToInt(Leitura::getPecasProduzidas).sum();
        int boas = leituras.stream().mapToInt(Leitura::getPecasBoas).sum();
        return boas / (double) produzidas;
    }

    private static Maquina maquina(String id, CenarioSimulacao cenario) {
        return new Maquina(id, "Máquina " + id, TipoMaquina.OUTRA, "Setor", "Linha A", 60,
                new FaixaTemperatura(10.0, 30.0), new LimitesAlerta(50, 15, 8.0), 100, 2,
                new Turno("06:00", "22:00"), true, cenario);
    }
}
