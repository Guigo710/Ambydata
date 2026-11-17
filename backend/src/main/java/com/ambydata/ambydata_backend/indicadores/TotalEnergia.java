package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.energia.SomaEnergia;

// Fábrica: soma das máquinas + encargos de demanda (contratada pela fábrica, não por máquina).
public record TotalEnergia(SomaEnergia maquinas, double horasPeriodo, double encargosDemanda, double custoLiquido) {
}
