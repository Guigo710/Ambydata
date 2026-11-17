package com.ambydata.ambydata_backend.energia;

// Balanço de energia de uma máquina num período, com os números usados em cada conta.
public record BalancoEnergia(
        double potenciaKw,
        double horasOperando,
        double consumoKwh,
        double custoEntrada,
        double potenciaRegeneradaKw,
        double horasRegeneracao,
        double energiaInjetadaKwh,
        double valorInjetado,
        double custoLiquido) {
}
