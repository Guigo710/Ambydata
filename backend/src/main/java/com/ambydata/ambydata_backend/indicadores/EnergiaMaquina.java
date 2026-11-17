package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.energia.BalancoEnergia;
import com.ambydata.ambydata_backend.maquina.ParametrosEnergia;

// Energia de uma máquina no período. `semParametros`: a máquina não tem potência cadastrada
// (balanço nulo, a tela pede o cadastro em vez de mostrar zero).
public record EnergiaMaquina(String id, String nome, String setor, String linha, boolean semParametros,
        ParametrosEnergia energia, BalancoEnergia balanco) {
}
