import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/contexto";
import CartaoMaquina from "../components/CartaoMaquina";
import CartaoResumoMaquina from "../components/CartaoResumoMaquina";
import { SeloSituacao, SeloStatus, Temperatura } from "../components/Selos";
import SeletorMaquina from "../components/SeletorMaquina";
import SobreEstesDados from "../components/SobreEstesDados";
import { mensagemDeErro } from "../services/api";
import { percentual, tempoDesde, useAgora, useResumo } from "../services/indicadores";
import { formatarNumero, porLinha, useMaquinaSelecionada } from "../services/maquinas";

// "1 operando · 1 parada · 1 com temperatura crítica" (só o que existe na hora).
function resumoDaFabrica(resumos, t) {
  const contar = (filtro) => resumos.filter(filtro).length;
  const operando = contar((r) => r.ultimaLeitura?.status === "OPERANDO");
  const paradas = contar((r) => r.ultimaLeitura?.status === "PARADA");
  const fora = contar((r) => r.ultimaLeitura?.status === "FORA_DO_TURNO");
  const semLeitura = contar((r) => !r.ultimaLeitura);
  const criticas = contar((r) => r.ultimaLeitura?.situacaoTemperatura === "CRITICO");
  const partes = [t("pages.dashboard.running", { count: operando }), t("pages.dashboard.stopped", { count: paradas })];
  if (fora) partes.push(t("pages.dashboard.offShift", { count: fora }));
  if (semLeitura) partes.push(t("pages.dashboard.noReading", { count: semLeitura }));
  if (criticas) partes.push(t("pages.dashboard.criticalTemperature", { count: criticas }));
  return partes.join(" · ");
}

// A leitura mais recente entre todas as máquinas, e a fonte (as duas, se misturadas).
function leituraMaisRecente(resumos, t) {
  const leituras = resumos.map((r) => r.ultimaLeitura).filter(Boolean);
  if (leituras.length === 0) return null;
  const maisRecente = leituras.reduce((a, b) => (new Date(a.instante) > new Date(b.instante) ? a : b));
  const origens = new Set(leituras.map((l) => l.origem));
  return { ...maisRecente, origem: origens.size > 1 ? t("dataInfo.mixedSource") : maisRecente.origem };
}

function TodasAsMaquinas({ onVer }) {
  const { t } = useTranslation();
  const resumo = useResumo();
  if (resumo.isPending) return <p className="tabela-vazia">{t("machines.loading")}</p>;
  if (resumo.isError) return <div className="error-message" role="alert">{mensagemDeErro(resumo.error)}</div>;

  const resumos = resumo.data;
  const porMaquina = new Map(resumos.map((r) => [r.maquina.id, r]));
  return (
    <>
      <p className="resumo-fabrica" role="status">{resumoDaFabrica(resumos, t)}</p>
      {porLinha(resumos.map((r) => r.maquina)).map(([linha, maquinas]) => (
        <section key={linha} className="grupo-linha" aria-label={linha}>
          <h2 className="grupo-linha-titulo">{linha}</h2>
          <div className="grade-cartoes">
            {maquinas.map((m) => <CartaoResumoMaquina key={m.id} resumo={porMaquina.get(m.id)} onVer={onVer} />)}
          </div>
        </section>
      ))}
      <SobreEstesDados maquina={t("pages.energy.allMachinesData", { count: resumos.length })} ultimaLeitura={leituraMaisRecente(resumos, t)}
        formulas={["oee", "disponibilidade", "performance", "qualidade"]} />
    </>
  );
}

function ResumoDeUmaMaquina({ maquina }) {
  const { t, i18n } = useTranslation();
  const agora = useAgora(maquina.id);
  return (
    <>
      <CartaoMaquina maquina={maquina} />
      {agora.isPending && <p className="tabela-vazia">{t("pages.dashboard.loading")}</p>}
      {agora.isError && <div className="error-message" role="alert">{mensagemDeErro(agora.error)}</div>}
      {agora.isSuccess && (
        <>
          <section className="stats-row" aria-label={t("pages.dashboard.machineSummary", { name: maquina.nome })}>
            <div className="stat-card">
              <span className="stat-label">{t("pages.dashboard.currentStatus")}</span>
              <span className="stat-value"><SeloStatus status={agora.data.ultimaLeitura?.status} /></span>
              <span className="stat-detalhe">{tempoDesde(agora.data.ultimaLeitura?.instante, undefined, t)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t("machines.temperature")}</span>
              <span className="stat-value"><Temperatura valor={agora.data.ultimaLeitura?.temperatura} /></span>
              <span className="stat-detalhe">
                <SeloSituacao situacao={agora.data.ultimaLeitura?.situacaoTemperatura} /> {t("machines.range", {
                  range: t("machines.rangeValue", {
                    min: formatarNumero(maquina.faixaTemperatura.min),
                    max: formatarNumero(maquina.faixaTemperatura.max),
                  }),
                })}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t("pages.dashboard.lastHourOee")}</span>
              <span className="stat-value">{percentual(agora.data.ultimaHora.indicadores.oee)}</span>
              <span className="stat-detalhe">{t("pages.dashboard.shiftOee", { value: percentual(agora.data.turno.indicadores.oee) })}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t("pages.dashboard.piecesLastHour")}</span>
              <span className="stat-value">{agora.data.ultimaHora.totais.pecasProduzidas.toLocaleString(i18n.resolvedLanguage ?? "pt-BR")}</span>
              <span className="stat-detalhe">{t("pages.dashboard.goodPieces", { count: agora.data.ultimaHora.totais.pecasBoas.toLocaleString(i18n.resolvedLanguage ?? "pt-BR") })}</span>
            </div>
          </section>
          <Link className="btn-link" to={`/status-maquina?maquina=${encodeURIComponent(maquina.id)}`}>{t("pages.dashboard.viewStatus")}</Link>
          <SobreEstesDados maquina={maquina.nome} ultimaLeitura={agora.data.ultimaLeitura}
            frequenciaSegundos={agora.data.frequenciaSegundos} formulas={["oee", "disponibilidade", "performance", "qualidade"]} />
        </>
      )}
    </>
  );
}

// Visão geral da fábrica ("Todas as máquinas") ou o resumo da máquina escolhida no seletor.
export default function PainelPrincipal() {
  const { t } = useTranslation();
  const { usuario } = useAuth();
  const selecao = useMaquinaSelecionada({ permitirTodas: true });

  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">{t("pages.dashboard.title")}</h1>
          <p className="page-greeting">{t("pages.dashboard.greeting", { name: usuario?.nome || t("pages.dashboard.fallbackUser") })}</p>
        </div>
        <SeletorMaquina selecao={selecao} permitirTodas />
      </div>
      {selecao.maquina
        ? <ResumoDeUmaMaquina key={selecao.maquina.id} maquina={selecao.maquina} />
        : <TodasAsMaquinas onVer={selecao.escolher} />}
    </>
  );
}
