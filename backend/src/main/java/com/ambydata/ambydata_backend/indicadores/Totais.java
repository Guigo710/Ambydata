package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.simulacao.GeradorLeituras;
import com.ambydata.ambydata_backend.simulacao.Leitura;
import com.ambydata.ambydata_backend.simulacao.StatusMaquina;

import java.util.Comparator;
import java.util.List;

// Somatório de um intervalo (uma hora, um turno, 24 h), base de todos os indicadores.
// Só conta o que está dentro do turno planejado: leitura FORA_DO_TURNO não entra.
// `paradas` = quantas vezes a máquina entrou em PARADA (uma parada já em curso no início
// do intervalo conta uma vez).
public record Totais(
        long segundosPlanejados,
        long segundosOperando,
        long segundosParado,
        int paradas,
        int pecasProduzidas,
        int pecasBoas) {

    public static final Totais VAZIO = new Totais(0, 0, 0, 0, 0, 0);

    public static Totais de(List<Leitura> leituras) {
        long planejados = 0;
        long operando = 0;
        long parado = 0;
        int paradas = 0;
        int produzidas = 0;
        int boas = 0;
        boolean estavaParada = false;
        List<Leitura> emOrdem = leituras.stream().sorted(Comparator.comparing(Leitura::getInstante)).toList();
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
        return new Totais(planejados, operando, parado, paradas, produzidas, boas);
    }

    // Soma de intervalos (ex.: as horas de um turno). Uma parada que atravessa a virada da
    // hora conta nas duas: aceitável para MTBF de demonstração.
    public Totais somar(Totais outro) {
        return new Totais(segundosPlanejados + outro.segundosPlanejados, segundosOperando + outro.segundosOperando,
                segundosParado + outro.segundosParado, paradas + outro.paradas,
                pecasProduzidas + outro.pecasProduzidas, pecasBoas + outro.pecasBoas);
    }
}
