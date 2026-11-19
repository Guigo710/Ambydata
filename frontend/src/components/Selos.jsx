import { formatarNumero } from "../services/maquinas";
import { useTranslation } from "react-i18next";

// Selos de status da máquina e de situação da temperatura, com cor e texto (a cor nunca é a
// única pista: o texto diz o mesmo).
export function SeloStatus({ status }) {
  const { t } = useTranslation();
  if (!status) return <span className="selo selo-sem-dados">{t("status.noReading")}</span>;
  return <span className={`selo selo-status-${status.toLowerCase()}`}>
    {t(`status.machine.${status}`, { defaultValue: status })}
  </span>;
}

export function SeloSituacao({ situacao }) {
  const { t } = useTranslation();
  if (!situacao) return null;
  return <span className={`selo selo-situacao-${situacao.toLowerCase()}`}>
    {t(`status.temperature.${situacao}`, { defaultValue: situacao })}
  </span>;
}

export function Temperatura({ valor }) {
  if (valor === null || valor === undefined) return <span>—</span>;
  return <span>{`${formatarNumero(valor)} °C`}</span>;
}
