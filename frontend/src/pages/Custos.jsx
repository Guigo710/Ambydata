import { useState } from "react";
import SeletorOpcoes from "../components/SeletorOpcoes";
import SobreEstesDados from "../components/SobreEstesDados";
import { mensagemDeErro } from "../services/api";
import { dinheiro, textoPeriodo, useFinanceiro } from "../services/indicadores";

const numero = (n) => Math.round(n).toLocaleString("pt-BR");
const horas = (h) => `${h.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;

function Valores({ financeiro }) {
  return (
    <>
      <td>{dinheiro(financeiro.custo)}</td>
      <td>{dinheiro(financeiro.receita)}</td>
      <td className={financeiro.lucro < 0 ? "valor-negativo" : "valor-positivo"}>{dinheiro(financeiro.lucro)}</td>
    </>
  );
}

// Custo, receita e lucro por máquina, por linha e da fábrica (só DIRETOR), com a conta.
export default function Custos() {
  const [periodo, setPeriodo] = useState("24h");
  const financeiro = useFinanceiro(periodo);
  const dados = financeiro.data;

  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">Custos e Lucros</h1>
          <p className="page-greeting">Por máquina e por linha</p>
        </div>
        <SeletorOpcoes legenda="Período" nome="periodo-custos" opcoes={[["24h", "24 horas"], ["7d", "7 dias"]]}
          valor={periodo} onChange={setPeriodo} />
      </div>

      {financeiro.isPending && <p className="tabela-vazia">Carregando custos...</p>}
      {financeiro.isError && <div className="error-message" role="alert">{mensagemDeErro(financeiro.error)}</div>}
      {financeiro.isSuccess && (
        <>
          <section className="stats-row stats-row-3" aria-label="Total da fábrica">
            <div className="stat-card">
              <span className="stat-label">Custo</span>
              <span className="stat-value">{dinheiro(dados.total.custo)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Receita</span>
              <span className="stat-value">{dinheiro(dados.total.receita)}</span>
            </div>
            <div className="stat-card stat-destaque">
              <span className="stat-label">Lucro</span>
              <span className="stat-value">{dinheiro(dados.total.lucro)}</span>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Por linha</h2>
            <table className="tabela" aria-label="Por linha">
              <thead>
                <tr><th scope="col">Linha</th><th scope="col">Custo</th><th scope="col">Receita</th><th scope="col">Lucro</th></tr>
              </thead>
              <tbody>
                {dados.linhas.map((l) => (
                  <tr key={l.linha}><th scope="row">{l.linha}</th><Valores financeiro={l.financeiro} /></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card espaco-acima">
            <h2 className="card-title">Por máquina</h2>
            <div className="tabela-rolagem">
              <table className="tabela" aria-label="Por máquina">
                <thead>
                  <tr>
                    <th scope="col">Máquina</th><th scope="col">Horas no turno</th><th scope="col">Peças boas</th>
                    <th scope="col">Custo</th><th scope="col">Receita</th><th scope="col">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.maquinas.map((m) => (
                    <tr key={m.id}>
                      <th scope="row">
                        {m.nome}
                        <span className="tabela-detalhe">{`${m.setor} · ${m.linha}`}</span>
                        <span className="tabela-detalhe">
                          {`${numero(m.pecasBoas)} × ${dinheiro(m.valorPorPeca)} − ${dinheiro(m.custoHora)} × ${horas(m.horasPlanejadas)}`}
                        </span>
                      </th>
                      <td>{horas(m.horasPlanejadas)}</td>
                      <td>{numero(m.pecasBoas)}</td>
                      <Valores financeiro={m.financeiro} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <SobreEstesDados maquina={`Todas as máquinas (${dados.maquinas.length})`} fonte="Agregados por hora das leituras"
            frequencia="a cada hora fechada" periodo={textoPeriodo(dados.inicio, dados.fim)} formulas={["lucro"]} />
        </>
      )}
    </>
  );
}
