package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.simulacao.GeradorLeituras;
import com.ambydata.ambydata_backend.simulacao.Leitura;
import com.ambydata.ambydata_backend.simulacao.StatusMaquina;

import java.util.Comparator;
import java.util.List;

// Somatório de um intervalo (uma hora, um turno, 24 h), base de todos os indicadores.
// Só conta o que está dentro do turno planejado: leitura FORA_DO_TURNO não entra.
// `paradas` = quantas vezes a máquina entrou em PARADA (uma parada já em curso no início
// do intervalo conta uma vez). `comecaParada`/`terminaParada` dizem se o intervalo abre ou
// fecha com a máquina parada, para que somar horas seguidas não conte duas vezes a mesma parada.
public record Totais(
        long segundosPlanejados,
        long segundosOperando,
        long segundosParado,
        int paradas,
        int pecasProduzidas,
        int pecasBoas,
        boolean comecaParada,
        boolean terminaParada) {

    public static final Totais VAZIO = new Totais(0, 0, 0, 0, 0, 0);

    // Totais sem informação de borda (intervalo que não começa nem termina parado).
    public Totais(long segundosPlanejados, long segundosOperando, long segundosParado, int paradas,
            int pecasProduzidas, int pecasBoas) {
        this(segundosPlanejados, segundosOperando, segundosParado, paradas, pecasProduzidas, pecasBoas, false, false);
    }

    public static Totais de(List<Leitura> leituras) {
        long planejados = 0;
        long operando = 0;
        long parado = 0;
        int paradas = 0;
        int produzidas = 0;
        int boas = 0;
        boolean estavaParada = false;
        List<Leitura> emOrdem = leituras.stream().sorted(Comparator.comparing(Leitura::getInstante)).toList();
        boolean comecaParada = !emOrdem.isEmpty() && emOrdem.getFirst().getStatus() == StatusMaquina.PARADA;
        for (Leitura l : emOrdem) {
            if (l.getStatus() == StatusMaquina.FORA_DO_TURNO) {
                estavaParada = false;
                continue;
            }
            planejados += GeradorLeituras.SEGUNDOS_POR_BLOCO;
            boolean parada = l.getStatus() == StatusMaquina.PARADA;
            if (parada && !estavaParada) {
                paradas++;
            }
            estavaParada = parada;
            if (!parada) {
                operando += GeradorLeituras.SEGUNDOS_POR_BLOCO;
            }
            parado += l.getSegundosParado();
            produzidas += l.getPecasProduzidas();
            boas += l.getPecasBoas();
        }
        return new Totais(planejados, operando, parado, paradas, produzidas, boas, comecaParada, estavaParada);
    }

    // Soma do intervalo seguinte (ex.: as horas de um turno, em ordem). Uma parada que
    // atravessa a virada da hora termina num e começa no outro: conta uma vez só.
    // Intervalo sem nada (VAZIO, ou só fora do turno) é neutro.
    public Totais somar(Totais seguinte) {
        if (vazio()) {
            return seguinte;
        }
        if (seguinte.vazio()) {
            return this;
        }
        int mesmaParada = terminaParada && seguinte.comecaParada ? 1 : 0;
        return new Totais(segundosPlanejados + seguinte.segundosPlanejados, segundosOperando + seguinte.segundosOperando,
                segundosParado + seguinte.segundosParado, paradas + seguinte.paradas - mesmaParada,
                pecasProduzidas + seguinte.pecasProduzidas, pecasBoas + seguinte.pecasBoas,
                comecaParada, seguinte.terminaParada);
    }

    private boolean vazio() {
        return segundosPlanejados == 0 && !comecaParada && !terminaParada;
    }
}
