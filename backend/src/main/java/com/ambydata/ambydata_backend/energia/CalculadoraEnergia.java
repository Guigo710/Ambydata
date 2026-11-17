package com.ambydata.ambydata_backend.energia;

import com.ambydata.ambydata_backend.maquina.ParametrosEnergia;

// Fórmulas do custo de energia (SPEC-indicadores, "Custo de energia"):
//   Consumo (kWh)          = potência ativa (kW) × tempo operando (h)
//   Custo de entrada (R$)  = consumo × tarifa cheia (TE + TUSD)
//   Energia injetada (kWh) = potência regenerada (kW) × tempo de regeneração (h),
//                            tempo de regeneração = tempo operando × percentual de regeneração
//   Valor injetado (R$)    = energia injetada × tarifa compensável
//   Custo líquido (R$)     = custo de entrada − valor injetado
//   Encargos/demanda (R$)  = demanda contratada × tarifa de demanda × horas do período ÷ 720
public final class CalculadoraEnergia {

    public static final double HORAS_NO_MES = 720;

    private CalculadoraEnergia() {
    }

    public static BalancoEnergia calcular(long segundosOperando, ParametrosEnergia energia, TarifasEnergia tarifas) {
        double horasOperando = segundosOperando / 3600.0;
        double consumo = energia.potenciaKw() * horasOperando;
        double custoEntrada = consumo * tarifas.getTarifaCheia();
        double horasRegeneracao = horasOperando * energia.percentualRegeneracao() / 100.0;
        double injetada = energia.potenciaRegeneradaKw() * horasRegeneracao;
        double valorInjetado = injetada * tarifas.getTarifaCompensavel();
        return new BalancoEnergia(energia.potenciaKw(), horasOperando, consumo, custoEntrada, energia.potenciaRegeneradaKw(),
                horasRegeneracao, injetada, valorInjetado, custoEntrada - valorInjetado);
    }

    public static double encargosDemanda(TarifasEnergia tarifas, double horasPeriodo) {
        return tarifas.getDemandaContratadaKw() * tarifas.getTarifaDemanda() * horasPeriodo / HORAS_NO_MES;
    }
}
