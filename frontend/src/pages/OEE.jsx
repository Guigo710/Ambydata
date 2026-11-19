import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/contexto";
import CartaoMaquina from "../components/CartaoMaquina";
import GraficoOeeHoras from "../components/GraficoOeeHoras";
import SeletorMaquina from "../components/SeletorMaquina";
import SeletorOpcoes from "../components/SeletorOpcoes";
import SobreEstesDados from "../components/SobreEstesDados";
import { mensagemDeErro } from "../services/api";
import { useMttr } from "../services/chamados";
import { formatarMinutos, percentual, useAgora, useHistorico } from "../services/indicadores";
import { useMaquinaSelecionada } from "../services/maquinas";

const numero = (n) => n.toLocaleString("pt-BR");

// "1 h planejada", "6 h planejadas", "45 min planejados".
function tempoPlanejado(segundos, t) {
  const minutos = segundos / 60;
  const texto = formatarMinutos(minutos);
  return t(minutos < 60 ? "pages.oee.plannedMinutes" : "pages.oee.plannedHours", { value: texto, count: minutos < 60 ? minutos : minutos / 60 });
}

// A conta de cada componente com os números do período (o que a spec chama de "fórmula e
// os números usados").
function contas(totais, indicadores, cadencia, t) {
  const operando = t("pages.oee.operating", { value: formatarMinutos(totais.segundosOperando / 60) });
  const ideal = Math.round((cadencia * totais.segundosOperando) / 60);
  return {
    disponibilidade: `${operando} ÷ ${tempoPlanejado(totais.segundosPlanejados, t)}`,
    performance: t("pages.oee.piecesProduced", {
      produced: numero(totais.pecasProduzidas),
      rate: cadencia,
      operatingTime: formatarMinutos(totais.segundosOperando / 60),
      ideal: numero(ideal),
    }),
    qualidade: t("pages.oee.qualityCalculation", { good: numero(totais.pecasBoas), produced: numero(totais.pecasProduzidas) }),
    oee: `${percentual(indicadores.disponibilidade)} × ${percentual(indicadores.performance)} × ${percentual(indicadores.qualidade)}`,
    mtbf: t("pages.oee.mtbfCalculation", {
      operating: operando,
      count: totais.paradas,
      unit: t("pages.oee.stops", { count: totais.paradas }),
    }),
  };
}

// "2 chamados finalizados nos últimos 7 dias" (MTTR vem dos chamados do Report de Manutenção).
function textoMttr(mttr, t) {
  if (mttr.isPending) return t("pages.oee.mttrLoading");
  if (mttr.isError) return t("pages.oee.mttrError");
  const n = mttr.data.chamadosFinalizados;
  if (n === 0) return t("pages.oee.mttrNone");
  return t("pages.oee.mttr", { count: n, days: mttr.data.dias });
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
  const { t } = useTranslation();
  const { perfil } = useAuth();
  const [periodo, setPeriodo] = useState("ultimaHora");
  const veConfiabilidade = perfil === "ENGENHEIRO" || perfil === "DIRETOR";
  const agora = useAgora(maquina.id);
  const historico = useHistorico(maquina.id, 24);
  const mttr = useMttr(maquina.id, veConfiabilidade);
  if (agora.isPending) return <p className="tabela-vazia">{t("pages.oee.loading")}</p>;
  if (agora.isError) return <div className="error-message" role="alert">{mensagemDeErro(agora.error)}</div>;

  const { totais, indicadores } = agora.data[periodo];
  const conta = contas(totais, indicadores, maquina.cadenciaIdeal, t);
  const semTurno = totais.segundosPlanejados === 0;

  return (
    <>
      <SeletorOpcoes legenda="common.period" nome="periodo-oee" opcoes={[["ultimaHora", "filters.lastHour"], ["turno", "filters.shift"]]}
        valor={periodo} onChange={setPeriodo} />
      {periodo === "turno" && !agora.data.turno.emAndamento && (
        <p className="stat-detalhe">{t("pages.oee.outsideShift")}</p>
      )}

      {semTurno && <p className="tabela-vazia">{t("pages.oee.noPlannedTime")}</p>}

      <section className="stats-row" aria-label={t("pages.oee.decomposition")}>
        <Componente titulo="OEE" valor={percentual(indicadores.oee)} formula={t("dataInfo.formulas.oee")} conta={conta.oee} destaque />
        <Componente titulo={t("pages.oee.availability")} valor={percentual(indicadores.disponibilidade)} formula={t("dataInfo.formulas.disponibilidade")} conta={conta.disponibilidade} />
        <Componente titulo={t("pages.oee.performance")} valor={percentual(indicadores.performance)} formula={t("dataInfo.formulas.performance")} conta={conta.performance} />
        <Componente titulo={t("pages.oee.quality")} valor={percentual(indicadores.qualidade)} formula={t("dataInfo.formulas.qualidade")} conta={conta.qualidade} />
      </section>

      {veConfiabilidade && (
        <section className="stats-row stats-row-3" aria-label={t("pages.oee.reliability")}>
          <Componente titulo={t("pages.oee.mtbf")} valor={formatarMinutos(indicadores.mtbfMinutos)}
            formula={t("dataInfo.formulas.mtbf")} conta={conta.mtbf} />
          <Componente titulo={t("pages.oee.downtime")} valor={formatarMinutos(indicadores.downtimeMinutos)}
            formula={t("dataInfo.formulas.downtime")}
            conta={t("pages.oee.stopsInPeriod", {
              count: totais.paradas,
              unit: t("pages.oee.stops", { count: totais.paradas }),
            })} />
          <Componente titulo={t("pages.oee.mttr")} valor={mttr.isSuccess ? formatarMinutos(mttr.data.mttrMinutos) : "—"}
            formula={t("dataInfo.formulas.mttr")} conta={textoMttr(mttr, t)} />
        </section>
      )}

      <section className="card" aria-labelledby="titulo-oee-24h">
        <h2 id="titulo-oee-24h" className="card-title">{t("pages.oee.historyTitle")}</h2>
        {historico.isPending && <p className="tabela-vazia">{t("pages.oee.loadingHistory")}</p>}
        {historico.isError && <p className="tabela-vazia">{mensagemDeErro(historico.error)}</p>}
        {historico.isSuccess && <GraficoOeeHoras maquina={maquina} historico={historico.data} />}
      </section>

      <SobreEstesDados maquina={maquina.nome} ultimaLeitura={agora.data.ultimaLeitura} frequenciaSegundos={agora.data.frequenciaSegundos}
        formulas={["oee", "disponibilidade", "performance", "qualidade", ...(veConfiabilidade ? ["mtbf", "downtime", "mttr"] : [])]} />
    </>
  );
}

// OEE da máquina escolhida: última hora ou turno, decomposto em D × P × Q com a conta, e as
// últimas 24 h hora a hora. MTBF e tempo parado para ENGENHEIRO e DIRETOR.
export default function OEE() {
  const { t } = useTranslation();
  const selecao = useMaquinaSelecionada();
  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">{t("pages.oee.title")}</h1>
          <p className="page-greeting">{t("pages.oee.subtitle")}</p>
        </div>
        <SeletorMaquina selecao={selecao} />
      </div>
      <CartaoMaquina maquina={selecao.maquina} />
      {selecao.maquina && <OeeDaMaquina key={selecao.maquina.id} maquina={selecao.maquina} />}
    </>
  );
}
