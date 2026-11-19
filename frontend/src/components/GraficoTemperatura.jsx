import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { formatarNumero } from "../services/maquinas";

const hora = (ms, locale) => new Date(ms).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
const numero = (valor, locale) => Number(valor).toLocaleString(locale, { maximumFractionDigits: 1 });

// Trechos seguidos com a máquina parada, para sombrear no gráfico.
function trechosParados(pontos) {
  const trechos = [];
  let inicio = null;
  pontos.forEach((p, i) => {
    if (p.status === "PARADA" && inicio === null) inicio = p.ms;
    const acabou = p.status !== "PARADA" || i === pontos.length - 1;
    if (inicio !== null && acabou) {
      trechos.push([inicio, p.ms]);
      inicio = null;
    }
  });
  return trechos;
}

// Eixo com números redondos (passo 1, 2, 5, 10, 20, 25, 50...) cobrindo dados e limites.
function escala(min, max) {
  const bruto = (max - min) / 5 || 1;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto);
  const inicio = Math.floor(min / passo) * passo - (min % passo === 0 ? passo : 0);
  const fim = Math.ceil(max / passo) * passo + (max % passo === 0 ? passo : 0);
  const marcas = [];
  for (let v = inicio; v <= fim + passo / 2; v += passo) marcas.push(Math.round(v * 100) / 100);
  return { dominio: [inicio, fim], marcas };
}

function descreverGrafico(maquina, pontos, periodo, t, locale) {
  const base = t("charts.temperatureDescription", { machine: maquina.nome, period: periodo });
  const critico = t("charts.criticalBelowAbove", {
    min: numero(maquina.limiteCritico.min, locale),
    max: numero(maquina.limiteCritico.max, locale),
  });
  const faixa = t("charts.temperatureRange", {
    range: t("machines.rangeValue", {
      min: formatarNumero(maquina.faixaTemperatura.min),
      max: formatarNumero(maquina.faixaTemperatura.max),
    }),
  });
  if (pontos.length === 0) return t("charts.temperatureEmpty", { base, range: faixa, critical: critico });
  const temperaturas = pontos.map((p) => p.temperatura);
  return t("charts.temperatureSummary", {
    base,
    min: numero(Math.min(...temperaturas), locale),
    max: numero(Math.max(...temperaturas), locale),
    range: faixa,
    critical: critico,
  });
}

// Temperatura ao longo do tempo com a faixa permitida (verde), os limites críticos (vermelho
// tracejado) e as paradas (cinza). O gráfico é uma imagem para leitores de tela: a descrição
// em texto diz o essencial.
export default function GraficoTemperatura({ maquina, pontos, periodo = "2 h" }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "pt-BR";
  const dados = pontos.map((p) => ({ ...p, ms: Date.parse(p.instante) }));
  const { faixaTemperatura: faixa, limiteCritico: critico } = maquina;
  const temperaturas = dados.map((p) => p.temperatura);
  const { dominio, marcas } = escala(Math.min(critico.min, ...temperaturas), Math.max(critico.max, ...temperaturas));

  return (
    <figure className="grafico-temperatura">
      <div role="img" aria-label={descreverGrafico(maquina, pontos, periodo, t, locale)} className="grafico-area">
        {dados.length === 0 ? (
          <p className="tabela-vazia">{t("charts.noReadings")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} accessibilityLayer={false}>
              <CartesianGrid stroke="#e6eaf5" vertical={false} />
              <XAxis dataKey="ms" type="number" domain={["dataMin", "dataMax"]} scale="time" tickFormatter={(ms) => hora(ms, locale)}
                tick={{ fontSize: 12, fill: "#6b7bb6" }} minTickGap={40} />
              <YAxis domain={dominio} ticks={marcas} tick={{ fontSize: 12, fill: "#6b7bb6" }} width={56} unit=" °C" />
              <ReferenceArea y1={faixa.min} y2={faixa.max} fill="#52b788" fillOpacity={0.12} />
              {trechosParados(dados).map(([de, ate]) => (
                <ReferenceArea key={de} x1={de} x2={ate} fill="#9ba8cc" fillOpacity={0.25} />
              ))}
              <ReferenceLine y={critico.max} stroke="#d00052" strokeDasharray="6 4" />
              <ReferenceLine y={critico.min} stroke="#d00052" strokeDasharray="6 4" />
              <Tooltip labelFormatter={(ms) => hora(ms, locale)} formatter={(v) => [`${numero(v, locale)} °C`, t("charts.temperature")]} />
              <Line type="monotone" dataKey="temperatura" stroke="#4361ee" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <figcaption className="grafico-legenda">
        <span className="legenda-item"><span className="legenda-cor legenda-faixa" /> {t("charts.allowedRange")}</span>
        <span className="legenda-item"><span className="legenda-cor legenda-critico" /> {t("charts.criticalLimit")}</span>
        <span className="legenda-item"><span className="legenda-cor legenda-parada" /> {t("charts.machineStopped")}</span>
      </figcaption>
    </figure>
  );
}
