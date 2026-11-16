import { useAuth } from "../auth/contexto";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";

// Dados de exemplo até o módulo "indicadores" ligar os gráficos à simulação.
const metricasExemplo = [
  { label: "Seg", oee: 72, custo: 1500, lucro: 3200 },
  { label: "Ter", oee: 78, custo: 1420, lucro: 3550 },
  { label: "Qua", oee: 69, custo: 1610, lucro: 2980 },
  { label: "Qui", oee: 81, custo: 1380, lucro: 3720 },
  { label: "Sex", oee: 76, custo: 1450, lucro: 3400 },
];

const radarData = [
  { subject: "CoreID RAW", A: 80, B: 65, C: 70 },
  { subject: "Sketch", A: 90, B: 75, C: 60 },
  { subject: "XD", A: 70, B: 85, C: 80 },
  { subject: "PS", A: 60, B: 70, C: 90 },
  { subject: "AI", A: 85, B: 60, C: 75 },
];

const manutencaoData = [
  { name: "Jan", v2020: 30.02, v2021: 25.28, v2022: 15.14 },
  { name: "Fev", v2020: 47.55, v2021: 13.55, v2022: 35.24 },
  { name: "Mar", v2020: 88.45, v2021: 18.34, v2022: 64.68 },
];

const produtividadeData = [
  { name: "Jan", A: 60, B: 40, C: 80 },
  { name: "Fev", A: 75, B: 55, C: 65 },
];

const COLORS_2020 = "#4361EE";
const COLORS_2021 = "#F72585";
const COLORS_2022 = "#4CC9F0";

function LegendRow() {
  return (
    <div className="chart-legend">
      {[
        ["2020", COLORS_2020],
        ["2021", COLORS_2021],
        ["2022", COLORS_2022],
      ].map(([year, color]) => (
        <div className="legend-item" key={year}>
          <div className="legend-dot" style={{ background: color }} />
          {year}
        </div>
      ))}
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  border: "none",
  boxShadow: "0 4px 16px rgba(27,37,87,0.12)",
  fontSize: 12,
};

export default function PainelPrincipal() {
  const { usuario } = useAuth();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Painel Principal</h1>
        <p className="page-greeting">Olá {usuario?.nome || "Usuário"}</p>
      </div>

      <div className="charts-grid">
        {/* Status da Máquina (Estático) */}
        <div className="card">
          <p className="card-title">Status da Máquina</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E8ECFB" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6B7BB6" }} />
              <Radar name="2020" dataKey="A" stroke={COLORS_2020} fill={COLORS_2020} fillOpacity={0.15} />
              <Radar name="2021" dataKey="B" stroke={COLORS_2021} fill={COLORS_2021} fillOpacity={0.15} />
              <Radar name="2022" dataKey="C" stroke={COLORS_2022} fill={COLORS_2022} fillOpacity={0.15} />
            </RadarChart>
          </ResponsiveContainer>
          <LegendRow />
        </div>

        {/* OEE em Tempo Real */}
        <div className="card">
          <p className="card-title">OEE em Tempo Real (%)</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={metricasExemplo}>
              <defs>
                <linearGradient id="oeeDinamic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS_2020} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={COLORS_2020} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9BA8CC" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9BA8CC" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="oee" stroke={COLORS_2020} fill="url(#oeeDinamic)" strokeWidth={2} dot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: COLORS_2020 }} />
              OEE (dados de exemplo)
            </div>
          </div>
        </div>

        {/* Report de Manutenção */}
        <div className="card">
          <p className="card-title">Report de Manutenção</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={manutencaoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9BA8CC" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9BA8CC" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="v2020" stroke={COLORS_2020} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <LegendRow />
        </div>

        {/* Custos e Lucros) */}
        <div className="card">
          <p className="card-title">Custos e Lucros (R$)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metricasExemplo} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9BA8CC" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9BA8CC" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="custo" name="Custo" fill={COLORS_2021} radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" name="Lucro" fill={COLORS_2022} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: COLORS_2021 }} /> Custo</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: COLORS_2022 }} /> Lucro</div>
          </div>
        </div>

        {/* Produtividade (Estático) */}
        <div className="card">
          <p className="card-title">Produtividade</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={produtividadeData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9BA8CC" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9BA8CC" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="A" fill={COLORS_2020} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <LegendRow />
        </div>
      </div>
    </>
  );
}