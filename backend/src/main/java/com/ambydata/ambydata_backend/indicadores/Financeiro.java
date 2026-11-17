package com.ambydata.ambydata_backend.indicadores;

// Em R$: custo = custo-hora × horas planejadas; receita = peças boas × valor por peça.
public record Financeiro(double custo, double receita, double lucro) {
}
