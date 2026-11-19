import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

const hora = (iso, locale) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
const numero = (n, locale) => n.toLocaleString(locale);

function descrever(maquina, historico, t, locale) {
  const { pecasProduzidas, pecasBoas } = historico.total.totais;
  const semDados = historico.horas.filter((h) => h.semDados).length;
  const partes = [t("charts.productionDescription", {
    machine: maquina.nome,
    count: historico.horas.length,
    produced: numero(pecasProduzidas, locale),
    good: numero(pecasBoas, locale),
    defective: numero(pecasProduzidas - pecasBoas, locale),
  })];
  if (semDados > 0) partes.push(t("charts.noDataHours", { count: semDados }));
  return `${partes.join("; ")}.`;
}

// Peças boas e defeituosas de cada hora fechada, empilhadas.
export default function GraficoProducaoHoras({ maquina, historico }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "pt-BR";
  const dados = historico.horas.map((h) => ({
    hora: hora(h.hora, locale),
    boas: h.totais ? h.totais.pecasBoas : null,
    defeituosas: h.totais ? h.totais.pecasProduzidas - h.totais.pecasBoas : null,
  }));
  return (
    <figure className="grafico-temperatura">
      <div role="img" aria-label={descrever(maquina, historico, t, locale)} className="grafico-area">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} accessibilityLayer={false}>
            <CartesianGrid stroke="#e6eaf5" vertical={false} />
            <XAxis dataKey="hora" tick={{ fontSize: 12, fill: "#6b7bb6" }} interval={2} />
            <YAxis tick={{ fontSize: 12, fill: "#6b7bb6" }} width={56} tickFormatter={(v) => numero(v, locale)} />
            <Tooltip formatter={(v, nome) => [numero(v, locale), t(nome === "boas" ? "charts.good" : "charts.defective")]} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(nome) => t(nome === "boas" ? "charts.good" : "charts.defective")} />
            <Bar dataKey="boas" stackId="pecas" fill="#52b788" isAnimationActive={false} />
            <Bar dataKey="defeituosas" stackId="pecas" fill="#f72585" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="grafico-legenda">{t("charts.productionLegend")}</figcaption>
    </figure>
  );
}
