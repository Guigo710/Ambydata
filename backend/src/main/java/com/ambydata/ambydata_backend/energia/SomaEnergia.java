package com.ambydata.ambydata_backend.energia;

// Soma de balanços (uma linha, a fábrica): só o que se soma entre máquinas diferentes.
public record SomaEnergia(double consumoKwh, double custoEntrada, double energiaInjetadaKwh, double valorInjetado,
        double custoLiquido) {

    public static final SomaEnergia ZERO = new SomaEnergia(0, 0, 0, 0, 0);

    public SomaEnergia mais(BalancoEnergia b) {
        return new SomaEnergia(consumoKwh + b.consumoKwh(), custoEntrada + b.custoEntrada(),
                energiaInjetadaKwh + b.energiaInjetadaKwh(), valorInjetado + b.valorInjetado(), custoLiquido + b.custoLiquido());
    }
}
