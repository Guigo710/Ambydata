import CartaoMaquina from "../components/CartaoMaquina";
import SeletorMaquina from "../components/SeletorMaquina";
import { useMaquinaSelecionada } from "../services/maquinas";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const data2020 = [
  { subject: "CoreID RAW", value: 80 },
  { subject: "Sketch", value: 90 },
  { subject: "XD", value: 70 },
  { subject: "PS", value: 60 },
  { subject: "AI", value: 85 },
];

const data2021 = [
  { subject: "CoreID RAW", value: 65 },
  { subject: "Sketch", value: 75 },
  { subject: "XD", value: 85 },
  { subject: "PS", value: 70 },
  { subject: "AI", value: 60 },
];

const data2022 = [
  { subject: "CoreID RAW", value: 70 },
  { subject: "Sketch", value: 60 },
  { subject: "XD", value: 80 },
  { subject: "PS", value: 90 },
  { subject: "AI", value: 75 },
];

const combined = data2020.map((d, i) => ({
  subject: d.subject,
  v2020: d.value,
  v2021: data2021[i].value,
  v2022: data2022[i].value,
}));

const stats = [
  { label: "Disponibilidade", value: "94.2%", change: "+2.1%", dir: "up" },
  { label: "Performance", value: "87.5%", change: "-0.8%", dir: "down" },
  { label: "Qualidade", value: "98.1%", change: "+1.3%", dir: "up" },
  { label: "OEE Geral", value: "81.9%", change: "+0.5%", dir: "up" },
];

const tooltipStyle = {
  borderRadius: 8,
  border: "none",
  boxShadow: "0 4px 16px rgba(27,37,87,0.12)",
  fontSize: 12,
};

export default function StatusMaquina() {
  const selecao = useMaquinaSelecionada();
  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">Status da Máquina</h1>
          <p className="page-greeting">Monitoramento em tempo real</p>
        </div>
        <SeletorMaquina selecao={selecao} />
      </div>

      <CartaoMaquina maquina={selecao.maquina} />

      <div className="stats-row">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
            <span className={`stat-change ${s.dir}`}>
              {s.change} vs mês anterior
            </span>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card" style={{ gridColumn: "span 2" }}>
          <p className="card-title">Comparativo por Período</p>
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={combined}>
              <PolarGrid stroke="#E8ECFB" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: "#6B7BB6" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "#9BA8CC" }}
              />
              <Radar
                name="2020"
                dataKey="v2020"
                stroke="#4361EE"
                fill="#4361EE"
                fillOpacity={0.18}
                strokeWidth={2}
              />
              <Radar
                name="2021"
                dataKey="v2021"
                stroke="#F72585"
                fill="#F72585"
                fillOpacity={0.18}
                strokeWidth={2}
              />
              <Radar
                name="2022"
                dataKey="v2022"
                stroke="#4CC9F0"
                fill="#4CC9F0"
                fillOpacity={0.18}
                strokeWidth={2}
              />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {[
              ["2020", "#4361EE"],
              ["2021", "#F72585"],
              ["2022", "#4CC9F0"],
            ].map(([y, c]) => (
              <div className="legend-item" key={y}>
                <div className="legend-dot" style={{ background: c }} />
                {y}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
