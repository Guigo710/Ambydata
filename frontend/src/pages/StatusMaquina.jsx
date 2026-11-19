import CartaoMaquina from "../components/CartaoMaquina";
import { useTranslation } from "react-i18next";
import GraficoTemperatura from "../components/GraficoTemperatura";
import { SeloSituacao, SeloStatus, Temperatura } from "../components/Selos";
import SeletorMaquina from "../components/SeletorMaquina";
import SobreEstesDados from "../components/SobreEstesDados";
import { mensagemDeErro } from "../services/api";
import { formatarMinutos, tempoDesde, useAgora, useLeituras, useRelogio } from "../services/indicadores";
import { formatarNumero, useMaquinaSelecionada } from "../services/maquinas";

// Aviso quando a temperatura sai da faixa (alerta) ou passa do limite crítico. O texto só muda
// quando a situação muda (o valor fica no cartão de temperatura), para o leitor de tela não
// repetir o aviso a cada atualização de 10 s.
function avisoDeTemperatura(maquina, leitura, t) {
  if (!leitura) return null;
  const { limiteCritico: critico } = maquina;
  if (leitura.situacaoTemperatura === "CRITICO") {
    const lado = leitura.temperatura > critico.max
      ? t("pages.machineStatus.criticalAbove", { limit: formatarNumero(critico.max) })
      : t("pages.machineStatus.criticalBelow", { limit: formatarNumero(critico.min) });
    return t("pages.machineStatus.criticalAlert", { side: lado });
  }
  if (leitura.situacaoTemperatura === "ALERTA") {
    return t("pages.machineStatus.temperatureAlert", {
      range: t("machines.rangeValue", {
        min: formatarNumero(maquina.faixaTemperatura.min),
        max: formatarNumero(maquina.faixaTemperatura.max),
      }),
    });
  }
  return null;
}

function SituacaoAtual({ maquina, agora }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "pt-BR";
  const relogio = useRelogio();
  const { ultimaLeitura: leitura, ultimaHora, turno } = agora;
  const defeituosas = ultimaHora.totais.pecasProduzidas - ultimaHora.totais.pecasBoas;
  return (
    <section className="stats-row" aria-label={t("pages.machineStatus.currentSituation", { name: maquina.nome })}>
      <div className="stat-card">
        <span className="stat-label">{t("pages.machineStatus.currentStatus")}</span>
        <span className="stat-value"><SeloStatus status={leitura?.status} /></span>
        <span className="stat-detalhe">{tempoDesde(leitura?.instante, relogio, t)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">{t("machines.temperature")}</span>
        <span className="stat-value"><Temperatura valor={leitura?.temperatura} /></span>
        <span className="stat-detalhe"><SeloSituacao situacao={leitura?.situacaoTemperatura} /></span>
      </div>
      <div className="stat-card">
        <span className="stat-label">{t("pages.machineStatus.piecesLastHour")}</span>
        <span className="stat-value">{ultimaHora.totais.pecasProduzidas.toLocaleString(locale)}</span>
        <span className="stat-detalhe">
          {t("pages.machineStatus.goodAndDefective", {
            good: ultimaHora.totais.pecasBoas.toLocaleString(locale),
            defective: defeituosas.toLocaleString(locale),
          })}
        </span>
      </div>
      <div className="stat-card">
        <span className="stat-label">{t("pages.machineStatus.stopsOnShift")}{turno.emAndamento ? "" : t("pages.machineStatus.shiftEnded")}</span>
        <span className="stat-value">{turno.totais.paradas}</span>
        <span className="stat-detalhe">
          {t("pages.machineStatus.downtimeMtbf", {
            downtime: formatarMinutos(turno.indicadores.downtimeMinutos),
            mtbf: formatarMinutos(turno.indicadores.mtbfMinutos),
          })}
        </span>
      </div>
    </section>
  );
}

function StatusDaMaquina({ maquina }) {
  const { t } = useTranslation();
  const agora = useAgora(maquina.id);
  const leituras = useLeituras(maquina.id, 120);
  if (agora.isPending) return <p className="tabela-vazia">{t("pages.machineStatus.loading")}</p>;
  if (agora.isError) return <div className="error-message" role="alert">{mensagemDeErro(agora.error)}</div>;

  const aviso = avisoDeTemperatura(maquina, agora.data.ultimaLeitura, t);
  return (
    <>
      {aviso && (
        <div role="status" className={`aviso-temperatura aviso-${agora.data.ultimaLeitura.situacaoTemperatura.toLowerCase()}`}>
          {aviso}
        </div>
      )}
      <SituacaoAtual maquina={maquina} agora={agora.data} />
      <section className="card" aria-labelledby="titulo-grafico-temperatura">
        <h2 id="titulo-grafico-temperatura" className="card-title">{t("pages.machineStatus.chartTitle")}</h2>
        {leituras.isPending && <p className="tabela-vazia">{t("pages.machineStatus.loadingReadings")}</p>}
        {leituras.isError && <p className="tabela-vazia">{mensagemDeErro(leituras.error)}</p>}
        {leituras.isSuccess && <GraficoTemperatura maquina={maquina} pontos={leituras.data} />}
      </section>
      <SobreEstesDados maquina={maquina.nome} ultimaLeitura={agora.data.ultimaLeitura}
        frequenciaSegundos={agora.data.frequenciaSegundos} formulas={["downtime", "mtbf", "limiteCritico"]} />
    </>
  );
}

// Situação da máquina escolhida agora: status, temperatura × faixa, peças, paradas e o
// gráfico das últimas 2 h. Atualiza sozinha a cada 10 s.
export default function StatusMaquina() {
  const { t } = useTranslation();
  const selecao = useMaquinaSelecionada();
  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">{t("pages.machineStatus.title")}</h1>
          <p className="page-greeting">{t("pages.machineStatus.subtitle")}</p>
        </div>
        <SeletorMaquina selecao={selecao} />
      </div>
      <CartaoMaquina maquina={selecao.maquina} />
      {selecao.maquina && <StatusDaMaquina key={selecao.maquina.id} maquina={selecao.maquina} />}
    </>
  );
}
