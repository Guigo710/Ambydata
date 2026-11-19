import { useState } from "react";
import { useTranslation } from "react-i18next";
import CartaoMaquina from "../components/CartaoMaquina";
import GraficoProducaoHoras from "../components/GraficoProducaoHoras";
import SeletorMaquina from "../components/SeletorMaquina";
import SeletorOpcoes from "../components/SeletorOpcoes";
import SobreEstesDados from "../components/SobreEstesDados";
import { mensagemDeErro } from "../services/api";
import { percentual, textoPeriodo, useAgora, useComparativo, useHistorico } from "../services/indicadores";
import { useMaquinaSelecionada } from "../services/maquinas";

const numero = (n) => Math.round(n).toLocaleString("pt-BR");
const PERIODOS = [["24h", "filters.24hours"], ["7d", "filters.7days"]];
const AGRUPAMENTOS = [["linha", "filters.line"], ["setor", "filters.sector"], ["maquina", "filters.machine"]];

function Comparativo({ maquina }) {
  const { t, i18n } = useTranslation();
  const [periodo, setPeriodo] = useState("24h");
  const [por, setPor] = useState("linha");
  const comparativo = useComparativo(periodo, por);
  const grupoDaMaquina = maquina && { linha: maquina.linha, setor: maquina.setor, maquina: maquina.nome }[por];
  return (
    <section className="card comparativo" aria-labelledby="titulo-comparativo">
      <div className="comparativo-topo">
        <h2 id="titulo-comparativo" className="card-title">{t("pages.productivity.comparison")}</h2>
        <div className="comparativo-filtros">
          <SeletorOpcoes legenda="filters.groupBy" nome="comparativo-por" opcoes={AGRUPAMENTOS} valor={por} onChange={setPor} />
          <SeletorOpcoes legenda="common.period" nome="comparativo-periodo" opcoes={PERIODOS} valor={periodo} onChange={setPeriodo} />
        </div>
      </div>
      {comparativo.isPending && <p className="tabela-vazia">{t("pages.productivity.loadingComparison")}</p>}
      {comparativo.isError && <p className="tabela-vazia">{mensagemDeErro(comparativo.error)}</p>}
      {comparativo.isSuccess && (
        <>
          <div className="tabela-rolagem">
            <table className="tabela" aria-label={t("pages.productivity.comparisonTable")}>
              <thead>
                <tr>
                  <th scope="col">{AGRUPAMENTOS.find(([v]) => v === por)[1]}</th>
                  <th scope="col">{t("pages.productivity.produced")}</th>
                  <th scope="col">{t("pages.productivity.good")}</th>
                  <th scope="col">{t("pages.productivity.defective")}</th>
                  <th scope="col">{t("pages.productivity.defects")}</th>
                  <th scope="col">{t("pages.productivity.piecesPerHour")}</th>
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
                      <td>{g.indicadores.pecasPorHora === null ? "—" : g.indicadores.pecasPorHora.toLocaleString(i18n.resolvedLanguage ?? "pt-BR", { maximumFractionDigits: 0 })}</td>
                      <td>{percentual(g.indicadores.oee)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="stat-detalhe">{t("pages.productivity.closedHours", { period: textoPeriodo(comparativo.data.inicio, comparativo.data.fim) })}</p>
        </>
      )}
    </section>
  );
}

function ProducaoDaMaquina({ maquina }) {
  const { t, i18n } = useTranslation();
  const agora = useAgora(maquina.id);
  const historico = useHistorico(maquina.id, 24);
  if (agora.isPending) return <p className="tabela-vazia">{t("pages.oee.loading")}</p>;
  if (agora.isError) return <div className="error-message" role="alert">{mensagemDeErro(agora.error)}</div>;

  const { totais, indicadores } = agora.data.ultimaHora;
  const defeituosas = totais.pecasProduzidas - totais.pecasBoas;
  const taxaDefeitos = totais.pecasProduzidas > 0 ? defeituosas / totais.pecasProduzidas : null;
  return (
    <>
      <section className="stats-row" aria-label={t("pages.productivity.production", { name: maquina.nome })}>
        <div className="stat-card">
          <span className="stat-label">{t("pages.productivity.piecesPerHour")}</span>
          <span className="stat-value">{indicadores.pecasPorHora === null ? "—" : indicadores.pecasPorHora.toLocaleString(i18n.resolvedLanguage ?? "pt-BR")}</span>
          <span className="stat-detalhe">{t("pages.productivity.idealLastHour", { count: numero(maquina.cadenciaIdeal * 60) })}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("pages.productivity.good")}</span>
          <span className="stat-value">{numero(totais.pecasBoas)}</span>
          <span className="stat-detalhe">{t("pages.productivity.lastHour")}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("pages.productivity.defective")}</span>
          <span className="stat-value">{numero(defeituosas)}</span>
          <span className="stat-detalhe">{t("pages.productivity.defectsRate", { value: percentual(taxaDefeitos) })}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("pages.productivity.piecesOnShift")}</span>
          <span className="stat-value">{numero(agora.data.turno.totais.pecasProduzidas)}</span>
          <span className="stat-detalhe">{t("pages.productivity.goodCount", { count: numero(agora.data.turno.totais.pecasBoas) })}</span>
        </div>
      </section>
      <section className="card" aria-labelledby="titulo-producao-24h">
        <h2 id="titulo-producao-24h" className="card-title">{t("pages.productivity.chartTitle")}</h2>
        {historico.isPending && <p className="tabela-vazia">{t("pages.productivity.loadingHistory")}</p>}
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
  const { t } = useTranslation();
  const selecao = useMaquinaSelecionada();
  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">{t("pages.productivity.title")}</h1>
          <p className="page-greeting">{t("pages.productivity.subtitle")}</p>
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
