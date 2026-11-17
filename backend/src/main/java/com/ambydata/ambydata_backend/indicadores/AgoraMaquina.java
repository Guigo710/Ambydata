package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.maquina.MaquinaResponse;

// Tudo de uma máquina neste momento: última leitura, última hora (60 min corridos) e turno.
public record AgoraMaquina(MaquinaResponse maquina, UltimaLeitura ultimaLeitura, Periodo ultimaHora, Periodo turno,
        int frequenciaSegundos) {
}
