import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatarNumero, textoFaixa } from "../services/maquinas";

const hora = (ms) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

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

function descreverGrafico(maquina, pontos, periodo) {
  const base = `Temperatura de ${maquina.nome} nas últimas ${periodo}`;
  const critico = `crítico abaixo de ${formatarNumero(maquina.limiteCritico.min)} °C ou acima de ${formatarNumero(maquina.limiteCritico.max)} °C`;
  const faixa = `faixa permitida ${textoFaixa(maquina.faixaTemperatura)}`;
  if (pontos.length === 0) return `${base}: sem leituras; ${faixa}; ${critico}.`;
  const temperaturas = pontos.map((p) => p.temperatura);
  return `${base}: mínima ${formatarNumero(Math.min(...temperaturas))} °C, máxima ${formatarNumero(Math.max(...temperaturas))} °C; ${faixa}; ${critico}.`;
}

// Temperatura ao longo do tempo com a faixa permitida (verde), os limites críticos (vermelho
// tracejado) e as paradas (cinza). O gráfico é uma imagem para leitores de tela: a descrição
// em texto diz o essencial.
export default function GraficoTemperatura({ maquina, pontos, periodo = "2 h" }) {
  const dados = pontos.map((p) => ({ ...p, ms: Date.parse(p.instante) }));
  const { faixaTemperatura: faixa, limiteCritico: critico } = maquina;
  const temperaturas = dados.map((p) => p.temperatura);
  const { dominio, marcas } = escala(Math.min(critico.min, ...temperaturas), Math.max(critico.max, ...temperaturas));

  return (
    <figure className="grafico-temperatura">
      <div role="img" aria-label={descreverGrafico(maquina, pontos, periodo)} className="grafico-area">
        {dados.length === 0 ? (
          <p className="tabela-vazia">Sem leituras neste período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} accessibilityLayer={false}>
              <CartesianGrid stroke="#e6eaf5" vertical={false} />
              <XAxis dataKey="ms" type="number" domain={["dataMin", "dataMax"]} scale="time" tickFormatter={hora}
                tick={{ fontSize: 12, fill: "#6b7bb6" }} minTickGap={40} />
              <YAxis domain={dominio} ticks={marcas} tick={{ fontSize: 12, fill: "#6b7bb6" }} width={56} unit=" °C" />
              <ReferenceArea y1={faixa.min} y2={faixa.max} fill="#52b788" fillOpacity={0.12} />
              {trechosParados(dados).map(([de, ate]) => (
                <ReferenceArea key={de} x1={de} x2={ate} fill="#9ba8cc" fillOpacity={0.25} />
              ))}
              <ReferenceLine y={critico.max} stroke="#d00052" strokeDasharray="6 4" />
              <ReferenceLine y={critico.min} stroke="#d00052" strokeDasharray="6 4" />
              <Tooltip labelFormatter={hora} formatter={(v) => [`${formatarNumero(v)} °C`, "Temperatura"]} />
              <Line type="monotone" dataKey="temperatura" stroke="#4361ee" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <figcaption className="grafico-legenda">
        <span className="legenda-item"><span className="legenda-cor legenda-faixa" /> Faixa permitida</span>
        <span className="legenda-item"><span className="legenda-cor legenda-critico" /> Limite crítico</span>
        <span className="legenda-item"><span className="legenda-cor legenda-parada" /> Máquina parada</span>
      </figcaption>
    </figure>
  );
}
