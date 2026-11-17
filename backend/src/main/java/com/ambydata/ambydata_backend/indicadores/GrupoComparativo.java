package com.ambydata.ambydata_backend.indicadores;

import java.util.List;

// Um setor, uma linha ou uma máquina no comparativo, com as máquinas que entraram na soma.
public record GrupoComparativo(String grupo, List<String> maquinas, Totais totais, Indicadores indicadores) {
}
