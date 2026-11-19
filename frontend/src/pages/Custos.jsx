import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [periodo, setPeriodo] = useState("24h");
  const financeiro = useFinanceiro(periodo);
  const dados = financeiro.data;

  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">{t("pages.costs.title")}</h1>
          <p className="page-greeting">{t("pages.costs.subtitle")}</p>
        </div>
        <SeletorOpcoes legenda="common.period" nome="periodo-custos" opcoes={[["24h", "filters.24hours"], ["7d", "filters.7days"]]}
          valor={periodo} onChange={setPeriodo} />
      </div>

      {financeiro.isPending && <p className="tabela-vazia">{t("pages.costs.loading")}</p>}
      {financeiro.isError && <div className="error-message" role="alert">{mensagemDeErro(financeiro.error)}</div>}
      {financeiro.isSuccess && (
        <>
          <section className="stats-row stats-row-3" aria-label={t("common.totalFactory")}>
            <div className="stat-card">
              <span className="stat-label">{t("common.cost")}</span>
              <span className="stat-value">{dinheiro(dados.total.custo)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t("common.revenue")}</span>
              <span className="stat-value">{dinheiro(dados.total.receita)}</span>
            </div>
            <div className="stat-card stat-destaque">
              <span className="stat-label">{t("common.profit")}</span>
              <span className="stat-value">{dinheiro(dados.total.lucro)}</span>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">{t("common.byLine")}</h2>
            <table className="tabela" aria-label={t("common.byLine")}>
              <thead>
                <tr><th scope="col">{t("common.line")}</th><th scope="col">{t("common.cost")}</th><th scope="col">{t("common.revenue")}</th><th scope="col">{t("common.profit")}</th></tr>
              </thead>
              <tbody>
                {dados.linhas.map((l) => (
                  <tr key={l.linha}><th scope="row">{l.linha}</th><Valores financeiro={l.financeiro} /></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card espaco-acima">
            <h2 className="card-title">{t("common.byMachine")}</h2>
            <div className="tabela-rolagem">
              <table className="tabela" aria-label={t("common.byMachine")}>
                <thead>
                  <tr>
                    <th scope="col">{t("common.machine")}</th><th scope="col">{t("pages.costs.hoursOnShift")}</th><th scope="col">{t("common.goodPieces")}</th>
                    <th scope="col">{t("common.cost")}</th><th scope="col">{t("common.revenue")}</th><th scope="col">{t("common.profit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.maquinas.map((m) => (
                    <tr key={m.id}>
                      <th scope="row">
                        {m.nome}
                        <span className="tabela-detalhe">{`${m.setor} · ${m.linha}`}</span>
                        <span className="tabela-detalhe">
                          {t("pages.costs.piecesFormula", {
                            good: numero(m.pecasBoas),
                            pieceValue: dinheiro(m.valorPorPeca),
                            hourlyCost: dinheiro(m.custoHora),
                            hours: horas(m.horasPlanejadas),
                          })}
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

          <SobreEstesDados maquina={t("pages.costs.allMachinesData", { count: dados.maquinas.length })}
            fonte={t("pages.costs.source")} frequencia={t("pages.costs.frequency")}
            periodo={textoPeriodo(dados.inicio, dados.fim)} formulas={["lucro"]} />
        </>
      )}
    </>
  );
}
