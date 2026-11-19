import { useTranslation } from "react-i18next";
import { dataHora } from "../services/chamados";

// Card do kanban (SPEC-chamados, "Card"): título, quem abriu, notas, data e hora, setor,
// máquina, prioridade e o responsável quando houver; os botões de ação vêm como children.
export default function CartaoChamado({ chamado, children }) {
  const { t } = useTranslation();
  const titulo = `${t(`chamados.types.${chamado.tipo}`, { defaultValue: chamado.tipo })} — ${chamado.maquinaNome}`;
  return (
    <article className={`card cartao-chamado prioridade-${chamado.prioridade.toLowerCase()}`} aria-label={titulo}>
      <header className="cartao-chamado-topo">
        <h3 className="cartao-chamado-titulo">{titulo}</h3>
        <span className={`selo selo-prioridade-${chamado.prioridade.toLowerCase()}`}>
          {t(`chamados.priorities.${chamado.prioridade}`, { defaultValue: chamado.prioridade })}
        </span>
      </header>
      <p className={`cartao-chamado-autor ${chamado.abertoPor.sistema ? "autor-sistema" : ""}`}>
        {chamado.abertoPor.sistema ? chamado.abertoPor.nome : t("chamados.openedBy", { name: chamado.abertoPor.nome })}
      </p>
      <p className="cartao-chamado-notas">{chamado.descricao}</p>
      <dl className="cartao-chamado-dados">
        <div><dt>{t("chamados.openedAt")}</dt><dd>{dataHora(chamado.abertoEm)}</dd></div>
        <div><dt>{t("chamados.location")}</dt><dd>{`${chamado.setor} · ${chamado.linha}`}</dd></div>
      </dl>
      {chamado.responsavel && <p className="cartao-chamado-responsavel">{t("chamados.responsible", { name: chamado.responsavel.nome })}</p>}
      {chamado.status === "FINALIZADO" && chamado.solucao && (
        <p className="cartao-chamado-solucao">{t("chamados.solutionValue", { solution: chamado.solucao })}</p>
      )}
      {children}
    </article>
  );
}
