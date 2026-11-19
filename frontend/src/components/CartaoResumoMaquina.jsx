import { useTranslation } from "react-i18next";
import { percentual } from "../services/indicadores";
import { formatarNumero } from "../services/maquinas";
import { SeloSituacao, SeloStatus, Temperatura } from "./Selos";

// Card de uma máquina no Painel ("Todas as máquinas"): status, temperatura × faixa e OEE
// da última hora. "Ver" mostra o resumo dela no próprio Painel.
export default function CartaoResumoMaquina({ resumo, onVer }) {
  const { t } = useTranslation();
  const { maquina, ultimaLeitura, ultimaHora } = resumo;
  const situacao = ultimaLeitura?.situacaoTemperatura;
  return (
    <article className={`card cartao-resumo ${situacao ? `borda-${situacao.toLowerCase()}` : ""}`} aria-label={maquina.nome}>
      <header className="cartao-resumo-topo">
        <div>
          <h3 className="cartao-resumo-nome">{maquina.nome}</h3>
          <p className="cartao-resumo-setor">{maquina.setor}</p>
        </div>
        <SeloStatus status={ultimaLeitura?.status} />
      </header>
      <dl className="cartao-resumo-dados">
        <div>
          <dt>{t("machines.temperature")}</dt>
          <dd className="cartao-resumo-temperatura">
            <Temperatura valor={ultimaLeitura?.temperatura} /> <SeloSituacao situacao={situacao} />
          </dd>
          <dd className="cartao-resumo-faixa">{t("machines.range", {
            range: t("machines.rangeValue", {
              min: formatarNumero(maquina.faixaTemperatura.min),
              max: formatarNumero(maquina.faixaTemperatura.max),
            }),
          })}</dd>
        </div>
        <div>
          <dt>{t("machines.oeeLastHour")}</dt>
          <dd className="cartao-resumo-oee">{percentual(ultimaHora?.indicadores?.oee)}</dd>
        </div>
      </dl>
      <button type="button" className="btn-link cartao-resumo-ver" aria-label={t("machines.viewNamed", { name: maquina.nome })} onClick={() => onVer(maquina.id)}>
        {t("machines.view")}
      </button>
    </article>
  );
}
