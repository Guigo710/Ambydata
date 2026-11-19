import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import { percentual } from "../services/indicadores";

const hora = (iso, locale) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

function descrever(maquina, historico, t, locale) {
  const comOee = historico.horas.filter((h) => h.indicadores?.oee !== null && h.indicadores?.oee !== undefined);
  const semDados = historico.horas.filter((h) => h.semDados).length;
  const partes = [t("charts.oeeDescription", {
    machine: maquina.nome,
    count: historico.horas.length,
    value: percentual(historico.total.indicadores.oee),
  })];
  if (comOee.length > 0) {
    const menor = comOee.reduce((a, b) => (b.indicadores.oee < a.indicadores.oee ? b : a));
    const maior = comOee.reduce((a, b) => (b.indicadores.oee > a.indicadores.oee ? b : a));
    partes.push(t("charts.lowest", { value: percentual(menor.indicadores.oee), time: hora(menor.hora, locale) }));
    partes.push(t("charts.highest", { value: percentual(maior.indicadores.oee), time: hora(maior.hora, locale) }));
  }
  if (semDados > 0) partes.push(t("charts.noDataHours", { count: semDados }));
  return `${partes.join("; ")}.`;
}

// OEE de cada hora fechada. Hora fora do turno ou sem dados fica sem barra (não é zero).
export default function GraficoOeeHoras({ maquina, historico }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "pt-BR";
  const dados = historico.horas.map((h) => ({
    hora: hora(h.hora, locale),
    oee: h.indicadores?.oee === null || h.indicadores?.oee === undefined ? null : Math.round(h.indicadores.oee * 1000) / 10,
  }));
  return (
    <figure className="grafico-temperatura">
      <div role="img" aria-label={descrever(maquina, historico, t, locale)} className="grafico-area">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} accessibilityLayer={false}>
            <CartesianGrid stroke="#e6eaf5" vertical={false} />
            <XAxis dataKey="hora" tick={{ fontSize: 12, fill: "#6b7bb6" }} interval={2} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" tick={{ fontSize: 12, fill: "#6b7bb6" }} width={48} />
            <Tooltip formatter={(v) => [`${String(v).replace(".", locale.startsWith("pt") ? "," : ".")}%`, t("charts.oeeTooltip")]} />
            <Bar dataKey="oee" fill="#4361ee" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="grafico-legenda">
        Uma barra por hora fechada. Sem barra: fora do turno ou sem dados naquela hora.
      </figcaption>
    </figure>
  );
}
