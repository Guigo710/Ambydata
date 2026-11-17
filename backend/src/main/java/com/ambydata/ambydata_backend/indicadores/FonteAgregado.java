package com.ambydata.ambydata_backend.indicadores;

// De onde saiu o agregado da hora: das leituras gravadas (hora com dispositivo) ou recalculado
// pelo gerador (máquina simulada, inclusive nas horas em que o backend estava dormindo).
public enum FonteAgregado {
    LEITURAS,
    GERADOR
}
