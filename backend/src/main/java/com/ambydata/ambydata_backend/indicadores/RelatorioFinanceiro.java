package com.ambydata.ambydata_backend.indicadores;

import java.time.Instant;
import java.util.List;

// Custos e lucros (só DIRETOR): por máquina, por linha e o total da fábrica.
public record RelatorioFinanceiro(String periodo, Instant inicio, Instant fim, List<FinanceiroMaquina> maquinas,
        List<FinanceiroGrupo> linhas, Financeiro total) {
}
