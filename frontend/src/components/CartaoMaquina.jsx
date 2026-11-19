import { useTranslation } from "react-i18next";
import { TIPOS_DE_MAQUINA, formatarNumero } from "../services/maquinas";

// Identificação da máquina selecionada: o que é, onde fica e quais limites valem para ela.
export default function CartaoMaquina({ maquina }) {
  const { t } = useTranslation();
  if (!maquina) return null;
  const { limiteCritico, alertas } = maquina;
  return (
    <section className="card cartao-maquina" aria-label={`${t("common.machine")} ${maquina.nome}`}>
      <div>
        <p className="cartao-maquina-nome">{maquina.nome}</p>
        <p className="cartao-maquina-local">{maquina.setor} · {maquina.linha}</p>
      </div>
      <dl className="cartao-maquina-dados">
        <div><dt>{t("machines.type")}</dt><dd>{t(`machines.types.${maquina.tipo}`, { defaultValue: TIPOS_DE_MAQUINA[maquina.tipo] ?? maquina.tipo })}</dd></div>
        <div><dt>{t("machines.cadence")}</dt><dd>{maquina.cadenciaIdeal} {t("machines.piecesPerMinute")}</dd></div>
        <div><dt>{t("machines.shift")}</dt><dd>{t("machines.shiftBetween", { start: maquina.turnoPlanejado.inicio, end: maquina.turnoPlanejado.fim })}</dd></div>
        <div><dt>{t("machines.allowedRange")}</dt><dd>
          {t("machines.rangeValue", {
            min: formatarNumero(maquina.faixaTemperatura.min),
            max: formatarNumero(maquina.faixaTemperatura.max),
          })}
        </dd></div>
        <div>
          <dt>{t("machines.critical")}</dt>
          <dd>{t("machines.criticalLimit", {
            min: formatarNumero(limiteCritico.min),
            max: formatarNumero(limiteCritico.max),
            percentage: alertas.percentualCritico,
          })}</dd>
        </div>
      </dl>
    </section>
  );
}
