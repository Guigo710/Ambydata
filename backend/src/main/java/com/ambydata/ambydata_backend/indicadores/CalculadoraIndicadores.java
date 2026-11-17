package com.ambydata.ambydata_backend.indicadores;

// Fórmulas da SPEC-indicadores, as mesmas mostradas na interface:
//   Disponibilidade = tempo operando ÷ tempo planejado do turno
//   Performance     = peças produzidas ÷ (cadência ideal × tempo operando)
//   Qualidade       = peças boas ÷ peças produzidas
//   OEE             = Disponibilidade × Performance × Qualidade
//   MTBF            = tempo operando ÷ número de paradas; Downtime = minutos parados
//   Lucro           = peças boas × valor por peça − custo-hora × horas planejadas
public final class CalculadoraIndicadores {

    private CalculadoraIndicadores() {
    }

    public static Indicadores calcular(Totais t, int cadenciaIdealPorMinuto) {
        return calcularComIdeal(t, pecasIdeais(t, cadenciaIdealPorMinuto));
    }

    // Peças que a cadência ideal faria no tempo operando (denominador da Performance).
    public static double pecasIdeais(Totais t, int cadenciaIdealPorMinuto) {
        return cadenciaIdealPorMinuto * t.segundosOperando() / 60.0;
    }

    // Para um grupo de máquinas (setor, linha), o ideal é a soma do ideal de cada uma, porque
    // as cadências são diferentes.
    public static Indicadores calcularComIdeal(Totais t, double idealNoTempoOperando) {
        Double disponibilidade = razao(t.segundosOperando(), t.segundosPlanejados());
        Double performance = razao(t.pecasProduzidas(), idealNoTempoOperando);
        Double qualidade = razao(t.pecasBoas(), t.pecasProduzidas());

        Double oee;
        if (disponibilidade == null) {
            oee = null;
        } else if (disponibilidade == 0) {
            oee = 0.0; // parada o tempo todo: não produziu nada
        } else {
            oee = performance == null || qualidade == null ? null : disponibilidade * performance * qualidade;
        }

        Double mtbf = t.paradas() == 0 ? null : t.segundosOperando() / 60.0 / t.paradas();
        Double pecasPorHora = razao(t.pecasProduzidas(), t.segundosPlanejados() / 3600.0);
        return new Indicadores(disponibilidade, performance, qualidade, oee, mtbf, t.segundosParado() / 60.0, pecasPorHora);
    }

    public static Financeiro financeiro(Totais t, double custoHora, double valorPorPeca) {
        double custo = custoHora * t.segundosPlanejados() / 3600.0;
        double receita = t.pecasBoas() * valorPorPeca;
        return new Financeiro(custo, receita, receita - custo);
    }

    private static Double razao(double parte, double todo) {
        return todo == 0 ? null : parte / todo;
    }
}
