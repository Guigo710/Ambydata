package com.ambydata.ambydata_backend.indicadores;

// Custo, receita e lucro de uma máquina, com os números usados na conta.
public record FinanceiroMaquina(String id, String nome, String setor, String linha, double custoHora,
        double valorPorPeca, double horasPlanejadas, int pecasBoas, Financeiro financeiro) {
}
