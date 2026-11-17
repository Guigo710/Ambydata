package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.maquina.MaquinaResponse;

import java.util.List;

// As últimas N horas fechadas de uma máquina, hora a hora, e o total do período.
public record Historico(MaquinaResponse maquina, List<PontoHistorico> horas, Periodo total) {
}
