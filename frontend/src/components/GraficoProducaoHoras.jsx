import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const hora = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const numero = (n) => n.toLocaleString("pt-BR");

function descrever(maquina, historico) {
  const { pecasProduzidas, pecasBoas } = historico.total.totais;
  const semDados = historico.horas.filter((h) => h.semDados).length;
  const partes = [`Peças por hora de ${maquina.nome} nas últimas ${historico.horas.length} h: `
    + `${numero(pecasProduzidas)} produzidas, ${numero(pecasBoas)} boas e ${numero(pecasProduzidas - pecasBoas)} defeituosas`];
  if (semDados > 0) partes.push(`${semDados} ${semDados === 1 ? "hora" : "horas"} sem dados`);
  return `${partes.join("; ")}.`;
}

// Peças boas e defeituosas de cada hora fechada, empilhadas.
export default function GraficoProducaoHoras({ maquina, historico }) {
  const dados = historico.horas.map((h) => ({
    hora: hora(h.hora),
    boas: h.totais ? h.totais.pecasBoas : null,
    defeituosas: h.totais ? h.totais.pecasProduzidas - h.totais.pecasBoas : null,
  }));
  return (
    <figure className="grafico-temperatura">
      <div role="img" aria-label={descrever(maquina, historico)} className="grafico-area">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} accessibilityLayer={false}>
            <CartesianGrid stroke="#e6eaf5" vertical={false} />
            <XAxis dataKey="hora" tick={{ fontSize: 12, fill: "#6b7bb6" }} interval={2} />
            <YAxis tick={{ fontSize: 12, fill: "#6b7bb6" }} width={56} tickFormatter={numero} />
            <Tooltip formatter={(v, nome) => [numero(v), nome === "boas" ? "Boas" : "Defeituosas"]} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(nome) => (nome === "boas" ? "Boas" : "Defeituosas")} />
            <Bar dataKey="boas" stackId="pecas" fill="#52b788" isAnimationActive={false} />
            <Bar dataKey="defeituosas" stackId="pecas" fill="#f72585" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="grafico-legenda">Uma barra por hora fechada. Sem barra: fora do turno ou sem dados naquela hora.</figcaption>
    </figure>
  );
}
