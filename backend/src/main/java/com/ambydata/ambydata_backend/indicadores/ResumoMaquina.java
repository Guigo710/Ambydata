package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.maquina.MaquinaResponse;

// Um card do Painel ("Todas as máquinas"): a máquina, a última leitura e a última hora.
public record ResumoMaquina(MaquinaResponse maquina, UltimaLeitura ultimaLeitura, Periodo ultimaHora) {
}
