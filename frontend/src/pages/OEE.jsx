import { useState } from "react";
import { useAuth } from "../auth/contexto";
import CartaoMaquina from "../components/CartaoMaquina";
import GraficoOeeHoras from "../components/GraficoOeeHoras";
import SeletorMaquina from "../components/SeletorMaquina";
import SeletorOpcoes from "../components/SeletorOpcoes";
import SobreEstesDados from "../components/SobreEstesDados";
import { mensagemDeErro } from "../services/api";
import { FORMULAS, formatarMinutos, percentual, useAgora, useHistorico } from "../services/indicadores";
import { useMaquinaSelecionada } from "../services/maquinas";

const numero = (n) => n.toLocaleString("pt-BR");

// "1 h planejada", "6 h planejadas", "45 min planejados".
function tempoPlanejado(segundos) {
  const minutos = segundos / 60;
  const texto = formatarMinutos(minutos);
  if (minutos < 60) return `${texto} planejados`;
  return minutos === 60 ? `${texto} planejada` : `${texto} planejadas`;
}

// A conta de cada componente com os números do período (o que a spec chama de "fórmula e
// os números usados").
function contas(totais, indicadores, cadencia) {
  const operando = formatarMinutos(totais.segundosOperando / 60);
  const ideal = Math.round((cadencia * totais.segundosOperando) / 60);
  return {
    disponibilidade: `${operando} operando ÷ ${tempoPlanejado(totais.segundosPlanejados)}`,
    performance: `${numero(totais.pecasProduzidas)} peças ÷ (${cadencia} peças/min × ${operando} = ${numero(ideal)} peças)`,
    qualidade: `${numero(totais.pecasBoas)} boas ÷ ${numero(totais.pecasProduzidas)} peças`,
    oee: `${percentual(indicadores.disponibilidade)} × ${percentual(indicadores.performance)} × ${percentual(indicadores.qualidade)}`,
    mtbf: `${operando} operando ÷ ${totais.paradas} ${totais.paradas === 1 ? "parada" : "paradas"}`,
  };
}

function Componente({ titulo, valor, formula, conta, destaque = false }) {
  return (
    <div className={`stat-card ${destaque ? "stat-destaque" : ""}`}>
      <span className="stat-label">{titulo}</span>
      <span className="stat-value">{valor}</span>
      <span className="stat-formula">{formula}</span>
      <span className="stat-detalhe">{conta}</span>
    </div>
  );
}

function OeeDaMaquina({ maquina }) {
  const { perfil } = useAuth();
  const [periodo, setPeriodo] = useState("ultimaHora");
  const agora = useAgora(maquina.id);
  const historico = useHistorico(maquina.id, 24);
  if (agora.isPending) return <p className="tabela-vazia">Carregando indicadores...</p>;
  if (agora.isError) return <div className="error-message" role="alert">{mensagemDeErro(agora.error)}</div>;

  const { totais, indicadores } = agora.data[periodo];
  const conta = contas(totais, indicadores, maquina.cadenciaIdeal);
  const semTurno = totais.segundosPlanejados === 0;
  const veConfiabilidade = perfil === "ENGENHEIRO" || perfil === "DIRETOR";

  return (
    <>
      <SeletorOpcoes legenda="Período" nome="periodo-oee" opcoes={[["ultimaHora", "Última hora"], ["turno", "Turno"]]}
        valor={periodo} onChange={setPeriodo} />
      {periodo === "turno" && !agora.data.turno.emAndamento && (
        <p className="stat-detalhe">Fora do turno agora: os números são do último turno completo.</p>
      )}

      {semTurno && <p className="tabela-vazia">Sem tempo planejado neste período (fora do turno): não há OEE para calcular.</p>}

      <section className="stats-row" aria-label="Decomposição do OEE">
        <Componente titulo="OEE" valor={percentual(indicadores.oee)} formula={FORMULAS.oee} conta={conta.oee} destaque />
        <Componente titulo="Disponibilidade" valor={percentual(indicadores.disponibilidade)} formula={FORMULAS.disponibilidade} conta={conta.disponibilidade} />
        <Componente titulo="Performance" valor={percentual(indicadores.performance)} formula={FORMULAS.performance} conta={conta.performance} />
        <Componente titulo="Qualidade" valor={percentual(indicadores.qualidade)} formula={FORMULAS.qualidade} conta={conta.qualidade} />
      </section>

      {veConfiabilidade && (
        <section className="stats-row stats-row-2" aria-label="Confiabilidade">
          <Componente titulo="MTBF (tempo médio entre paradas)" valor={formatarMinutos(indicadores.mtbfMinutos)}
            formula={FORMULAS.mtbf} conta={conta.mtbf} />
          <Componente titulo="Tempo parado (downtime)" valor={formatarMinutos(indicadores.downtimeMinutos)}
            formula={FORMULAS.downtime} conta={`${totais.paradas} ${totais.paradas === 1 ? "parada" : "paradas"} no período`} />
        </section>
      )}

      <section className="card" aria-labelledby="titulo-oee-24h">
        <h2 id="titulo-oee-24h" className="card-title">OEE nas últimas 24 h</h2>
        {historico.isPending && <p className="tabela-vazia">Carregando histórico...</p>}
        {historico.isError && <p className="tabela-vazia">{mensagemDeErro(historico.error)}</p>}
        {historico.isSuccess && <GraficoOeeHoras maquina={maquina} historico={historico.data} />}
      </section>

      <SobreEstesDados maquina={maquina.nome} ultimaLeitura={agora.data.ultimaLeitura} frequenciaSegundos={agora.data.frequenciaSegundos}
        formulas={["oee", "disponibilidade", "performance", "qualidade", ...(veConfiabilidade ? ["mtbf", "downtime"] : [])]} />
    </>
  );
}

// OEE da máquina escolhida: última hora ou turno, decomposto em D × P × Q com a conta, e as
// últimas 24 h hora a hora. MTBF e tempo parado para ENGENHEIRO e DIRETOR.
export default function OEE() {
  const selecao = useMaquinaSelecionada();
  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">OEE em tempo real</h1>
          <p className="page-greeting">Disponibilidade × Performance × Qualidade</p>
        </div>
        <SeletorMaquina selecao={selecao} />
      </div>
      <CartaoMaquina maquina={selecao.maquina} />
      {selecao.maquina && <OeeDaMaquina key={selecao.maquina.id} maquina={selecao.maquina} />}
    </>
  );
}
