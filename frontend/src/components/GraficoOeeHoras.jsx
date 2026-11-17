import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { percentual } from "../services/indicadores";

const hora = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function descrever(maquina, historico) {
  const comOee = historico.horas.filter((h) => h.indicadores?.oee !== null && h.indicadores?.oee !== undefined);
  const semDados = historico.horas.filter((h) => h.semDados).length;
  const partes = [`OEE por hora de ${maquina.nome} nas últimas ${historico.horas.length} h: OEE do período ${percentual(historico.total.indicadores.oee)}`];
  if (comOee.length > 0) {
    const menor = comOee.reduce((a, b) => (b.indicadores.oee < a.indicadores.oee ? b : a));
    const maior = comOee.reduce((a, b) => (b.indicadores.oee > a.indicadores.oee ? b : a));
    partes.push(`menor ${percentual(menor.indicadores.oee)} às ${hora(menor.hora)}`);
    partes.push(`maior ${percentual(maior.indicadores.oee)} às ${hora(maior.hora)}`);
  }
  if (semDados > 0) partes.push(`${semDados} ${semDados === 1 ? "hora" : "horas"} sem dados`);
  return `${partes.join("; ")}.`;
}

// OEE de cada hora fechada. Hora fora do turno ou sem dados fica sem barra (não é zero).
export default function GraficoOeeHoras({ maquina, historico }) {
  const dados = historico.horas.map((h) => ({
    hora: hora(h.hora),
    oee: h.indicadores?.oee === null || h.indicadores?.oee === undefined ? null : Math.round(h.indicadores.oee * 1000) / 10,
  }));
  return (
    <figure className="grafico-temperatura">
      <div role="img" aria-label={descrever(maquina, historico)} className="grafico-area">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e6eaf5" vertical={false} />
            <XAxis dataKey="hora" tick={{ fontSize: 12, fill: "#6b7bb6" }} interval={2} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" tick={{ fontSize: 12, fill: "#6b7bb6" }} width={48} />
            <Tooltip formatter={(v) => [`${String(v).replace(".", ",")}%`, "OEE"]} />
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
