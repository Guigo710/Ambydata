package com.ambydata.ambydata_backend.maquina;

// Como o simulador se comporta para esta máquina (ver SPEC-simulacao.md). Definido pelo
// seed; máquinas novas nascem SAUDAVEL.
public enum CenarioSimulacao {
    SAUDAVEL,
    AQUECIMENTO,
    OSCILACAO,
    PARADAS_FREQUENTES,
    DEFEITOS_ALTOS
}
