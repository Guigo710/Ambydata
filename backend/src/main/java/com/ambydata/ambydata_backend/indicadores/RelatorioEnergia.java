package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.energia.TarifasEnergia;

import java.time.Instant;
import java.util.List;

// Painel Energia (ENGENHEIRO e DIRETOR): tarifas usadas, cada máquina, cada linha e a fábrica.
public record RelatorioEnergia(String periodo, Instant inicio, Instant fim, TarifasEnergia tarifas,
        List<EnergiaMaquina> maquinas, List<EnergiaLinha> linhas, TotalEnergia total) {
}
