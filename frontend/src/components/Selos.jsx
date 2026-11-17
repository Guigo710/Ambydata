import { formatarNumero } from "../services/maquinas";
import { NOME_DA_SITUACAO, NOME_DO_STATUS } from "../services/indicadores";

// Selos de status da máquina e de situação da temperatura, com cor e texto (a cor nunca é a
// única pista: o texto diz o mesmo).
export function SeloStatus({ status }) {
  if (!status) return <span className="selo selo-sem-dados">Sem leitura</span>;
  return <span className={`selo selo-status-${status.toLowerCase()}`}>{NOME_DO_STATUS[status] ?? status}</span>;
}

export function SeloSituacao({ situacao }) {
  if (!situacao) return null;
  return <span className={`selo selo-situacao-${situacao.toLowerCase()}`}>{NOME_DA_SITUACAO[situacao] ?? situacao}</span>;
}

export function Temperatura({ valor }) {
  if (valor === null || valor === undefined) return <span>—</span>;
  return <span>{`${formatarNumero(valor)} °C`}</span>;
}
