package com.ambydata.ambydata_backend.simulacao;

import com.ambydata.ambydata_backend.maquina.CenarioSimulacao;
import com.ambydata.ambydata_backend.maquina.FaixaTemperatura;
import com.ambydata.ambydata_backend.maquina.Maquina;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.SplittableRandom;

// Gera a leitura de uma máquina num instante a partir de (máquina, bloco de 10 s, cenário),
// sem estado: o mesmo instante gera sempre a mesma leitura. Por isso o intervalo em que o
// backend esteve parado pode ser preenchido depois, de forma coerente.
public class GeradorLeituras {

    static final int SEGUNDOS_POR_BLOCO = 10;
    private static final int BLOCOS_POR_JANELA_DE_PARADA = 30;   // 5 min
    private static final int BLOCOS_CICLO_AQUECIMENTO = 720;     // 2 h
    private static final int BLOCOS_CICLO_OSCILACAO = 360;       // 1 h

    private final ZoneId fuso;

    public GeradorLeituras(ZoneId fuso) {
        this.fuso = fuso;
    }

    public Leitura gerar(Maquina maquina, Instant instante) {
        long bloco = Math.floorDiv(instante.getEpochSecond(), SEGUNDOS_POR_BLOCO);
        Instant inicioDoBloco = Instant.ofEpochSecond(bloco * SEGUNDOS_POR_BLOCO);
        SplittableRandom aleatorio = new SplittableRandom(semente(maquina.getId(), bloco));
        double temperatura = arredondar(temperatura(maquina, bloco, aleatorio));

        Leitura leitura = new Leitura(Leitura.idDe(maquina.getId(), inicioDoBloco), maquina.getId(), inicioDoBloco,
                StatusMaquina.FORA_DO_TURNO, temperatura, 0, 0, 0, OrigemLeitura.SIMULADOR);

        if (!maquina.getTurnoPlanejado().contem(LocalTime.ofInstant(inicioDoBloco, fuso))) {
            return leitura;
        }
        if (emParada(maquina, bloco)) {
            leitura.setStatus(StatusMaquina.PARADA);
            leitura.setSegundosParado(SEGUNDOS_POR_BLOCO);
            return leitura;
        }

        double ideal = maquina.getCadenciaIdeal() * SEGUNDOS_POR_BLOCO / 60.0;
        // Ritmo calibrado para os OEE da SPEC-simulacao (saudável ~85%, paradas frequentes ~55%).
        double ritmo = switch (maquina.getCenario()) {
            case SAUDAVEL -> 0.89;
            case PARADAS_FREQUENTES -> 0.90;
            default -> 0.95;
        } + (aleatorio.nextDouble() - 0.5) * 0.06;
        // Arredondamento sorteado: em média produz exatamente ideal × ritmo, qualquer que seja a cadência.
        double esperado = Math.max(0, ideal * ritmo);
        int produzidas = (int) Math.floor(esperado) + (aleatorio.nextDouble() < esperado - Math.floor(esperado) ? 1 : 0);
        double taxaDefeitos = switch (maquina.getCenario()) {
            case DEFEITOS_ALTOS -> 0.12;
            case SAUDAVEL -> 0.012;
            default -> 0.025;
        };
        int defeitos = 0;
        for (int i = 0; i < produzidas; i++) {
            if (aleatorio.nextDouble() < taxaDefeitos) {
                defeitos++;
            }
        }
        leitura.setStatus(StatusMaquina.OPERANDO);
        leitura.setPecasProduzidas(produzidas);
        leitura.setPecasBoas(produzidas - defeitos);
        return leitura;
    }

    // Paradas acontecem em janelas de 5 min, sorteadas por máquina e janela.
    private static boolean emParada(Maquina maquina, long bloco) {
        long janela = Math.floorDiv(bloco, BLOCOS_POR_JANELA_DE_PARADA);
        double chance = switch (maquina.getCenario()) {
            case PARADAS_FREQUENTES -> 0.37;
            case SAUDAVEL -> 0.03;
            default -> 0.06;
        };
        return new SplittableRandom(semente(maquina.getId(), janela) ^ 0x5DEECE66DL).nextDouble() < chance;
    }

    private static double temperatura(Maquina maquina, long bloco, SplittableRandom aleatorio) {
        FaixaTemperatura faixa = maquina.getFaixaTemperatura();
        double meio = (faixa.min() + faixa.max()) / 2;
        double largura = faixa.largura();
        double ruido = (aleatorio.nextDouble() - 0.5) * 0.1 * largura;
        return switch (maquina.getCenario()) {
            // Sobe aos poucos durante 2 h, passa da faixa e do limite crítico, e "volta da manutenção".
            case AQUECIMENTO -> meio + (Math.floorMod(bloco, BLOCOS_CICLO_AQUECIMENTO) / (double) BLOCOS_CICLO_AQUECIMENTO)
                    * 1.2 * largura + ruido;
            // Oscila e sai um pouco da faixa (alerta), sem chegar ao crítico.
            case OSCILACAO -> meio + 0.6 * largura * Math.sin(2 * Math.PI * bloco / BLOCOS_CICLO_OSCILACAO) + ruido;
            default -> meio + ruido;
        };
    }

    private static long semente(String maquinaId, long n) {
        return maquinaId.hashCode() * 0x9E3779B97F4A7C15L + n;
    }

    private static double arredondar(double valor) {
        return Math.round(valor * 10) / 10.0;
    }
}
