import { useState } from "react";
import CartaoMaquina from "../components/CartaoMaquina";
import GraficoProducaoHoras from "../components/GraficoProducaoHoras";
import SeletorMaquina from "../components/SeletorMaquina";
import SeletorOpcoes from "../components/SeletorOpcoes";
import SobreEstesDados from "../components/SobreEstesDados";
import { mensagemDeErro } from "../services/api";
import { percentual, textoPeriodo, useAgora, useComparativo, useHistorico } from "../services/indicadores";
import { useMaquinaSelecionada } from "../services/maquinas";

const numero = (n) => Math.round(n).toLocaleString("pt-BR");
const PERIODOS = [["24h", "24 horas"], ["7d", "7 dias"]];
const AGRUPAMENTOS = [["linha", "Linha"], ["setor", "Setor"], ["maquina", "Máquina"]];

function Comparativo({ maquina }) {
  const [periodo, setPeriodo] = useState("24h");
  const [por, setPor] = useState("linha");
  const comparativo = useComparativo(periodo, por);
  const grupoDaMaquina = maquina && { linha: maquina.linha, setor: maquina.setor, maquina: maquina.nome }[por];
  return (
    <section className="card comparativo" aria-labelledby="titulo-comparativo">
      <div className="comparativo-topo">
        <h2 id="titulo-comparativo" className="card-title">Comparativo</h2>
        <div className="comparativo-filtros">
          <SeletorOpcoes legenda="Agrupar por" nome="comparativo-por" opcoes={AGRUPAMENTOS} valor={por} onChange={setPor} />
          <SeletorOpcoes legenda="Período" nome="comparativo-periodo" opcoes={PERIODOS} valor={periodo} onChange={setPeriodo} />
        </div>
      </div>
      {comparativo.isPending && <p className="tabela-vazia">Carregando comparativo...</p>}
      {comparativo.isError && <p className="tabela-vazia">{mensagemDeErro(comparativo.error)}</p>}
      {comparativo.isSuccess && (
        <>
          <div className="tabela-rolagem">
            <table className="tabela" aria-label="Comparativo de produtividade">
              <thead>
                <tr>
                  <th scope="col">{AGRUPAMENTOS.find(([v]) => v === por)[1]}</th>
                  <th scope="col">Produzidas</th>
                  <th scope="col">Boas</th>
                  <th scope="col">Defeituosas</th>
                  <th scope="col">Defeitos</th>
                  <th scope="col">Peças/h</th>
                  <th scope="col">OEE</th>
                </tr>
              </thead>
              <tbody>
                {comparativo.data.grupos.map((g) => {
                  const defeituosas = g.totais.pecasProduzidas - g.totais.pecasBoas;
                  return (
                    <tr key={g.grupo} className={g.grupo === grupoDaMaquina ? "linha-destacada" : ""}>
                      <th scope="row">
                        {g.grupo}
                        {por !== "maquina" && <span className="tabela-detalhe">{g.maquinas.join(", ")}</span>}
                      </th>
                      <td>{numero(g.totais.pecasProduzidas)}</td>
                      <td>{numero(g.totais.pecasBoas)}</td>
                      <td>{numero(defeituosas)}</td>
                      <td>{percentual(g.indicadores.qualidade === null ? null : 1 - g.indicadores.qualidade)}</td>
                      <td>{g.indicadores.pecasPorHora === null ? "—" : numero(g.indicadores.pecasPorHora)}</td>
                      <td>{percentual(g.indicadores.oee)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="stat-detalhe">{`Horas fechadas de ${textoPeriodo(comparativo.data.inicio, comparativo.data.fim)}.`}</p>
        </>
      )}
    </section>
  );
}

function ProducaoDaMaquina({ maquina }) {
  const agora = useAgora(maquina.id);
  const historico = useHistorico(maquina.id, 24);
  if (agora.isPending) return <p className="tabela-vazia">Carregando indicadores...</p>;
  if (agora.isError) return <div className="error-message" role="alert">{mensagemDeErro(agora.error)}</div>;

  const { totais, indicadores } = agora.data.ultimaHora;
  const defeituosas = totais.pecasProduzidas - totais.pecasBoas;
  const taxaDefeitos = totais.pecasProduzidas > 0 ? defeituosas / totais.pecasProduzidas : null;
  return (
    <>
      <section className="stats-row" aria-label={`Produção de ${maquina.nome}`}>
        <div className="stat-card">
          <span className="stat-label">Peças por hora</span>
          <span className="stat-value">{indicadores.pecasPorHora === null ? "—" : numero(indicadores.pecasPorHora)}</span>
          <span className="stat-detalhe">última hora · ideal {numero(maquina.cadenciaIdeal * 60)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Peças boas</span>
          <span className="stat-value">{numero(totais.pecasBoas)}</span>
          <span className="stat-detalhe">última hora</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Peças defeituosas</span>
          <span className="stat-value">{numero(defeituosas)}</span>
          <span className="stat-detalhe">{`${percentual(taxaDefeitos)} de defeitos`}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Peças no turno</span>
          <span className="stat-value">{numero(agora.data.turno.totais.pecasProduzidas)}</span>
          <span className="stat-detalhe">{`${numero(agora.data.turno.totais.pecasBoas)} boas`}</span>
        </div>
      </section>
      <section className="card" aria-labelledby="titulo-producao-24h">
        <h2 id="titulo-producao-24h" className="card-title">Peças boas e defeituosas nas últimas 24 h</h2>
        {historico.isPending && <p className="tabela-vazia">Carregando histórico...</p>}
        {historico.isError && <p className="tabela-vazia">{mensagemDeErro(historico.error)}</p>}
        {historico.isSuccess && <GraficoProducaoHoras maquina={maquina} historico={historico.data} />}
      </section>
      <Comparativo maquina={maquina} />
      <SobreEstesDados maquina={maquina.nome} ultimaLeitura={agora.data.ultimaLeitura}
        frequenciaSegundos={agora.data.frequenciaSegundos} formulas={["pecasPorHora", "qualidade"]} />
    </>
  );
}

// Produção da máquina escolhida (peças por hora, boas × defeituosas) e o comparativo por
// linha, setor ou máquina em 24 h e 7 dias.
export default function Produtividade() {
  const selecao = useMaquinaSelecionada();
  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">Produtividade</h1>
          <p className="page-greeting">Peças por hora, boas e defeituosas</p>
        </div>
        <SeletorMaquina selecao={selecao} />
      </div>
      <CartaoMaquina maquina={selecao.maquina} />
      {selecao.maquina
        ? <ProducaoDaMaquina key={selecao.maquina.id} maquina={selecao.maquina} />
        : !selecao.carregando && <Comparativo maquina={null} />}
    </>
  );
}
