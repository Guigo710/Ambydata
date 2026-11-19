import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { mensagemDeErro } from "../services/api";
import { dataHora, useChamado } from "../services/chamados";

// Detalhe do chamado com o histórico (abre pelo card ou pelo link da notificação). Diálogo
// modal acessível: fica fora do layout (portal) e o layout vira `inert` enquanto ele está aberto
// (o foco não escapa para o menu ou o sino); Esc ou "Fechar" saem e o foco volta para onde estava.
export default function DetalheChamado({ id, onFechar }) {
  const { t } = useTranslation();
  const chamado = useChamado(id);
  const dialogo = useRef(null);
  const titulo = useRef(null);

  useEffect(() => {
    const antes = document.activeElement;
    const layout = document.querySelector(".layout");
    layout?.setAttribute("inert", "");
    dialogo.current?.focus();
    return () => {
      layout?.removeAttribute("inert");
      if (antes instanceof HTMLElement && document.contains(antes)) antes.focus();
    };
  }, []);

  useEffect(() => {
    if (chamado.isSuccess) titulo.current?.focus();
  }, [chamado.isSuccess]);

  const aoTeclar = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onFechar();
    }
  };

  const c = chamado.data;
  return createPortal(
    <div className="fundo-dialogo" onKeyDown={aoTeclar} onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="card dialogo" role="dialog" aria-modal="true" aria-labelledby="titulo-detalhe-chamado" tabIndex={-1} ref={dialogo}>
        {chamado.isPending && <p className="tabela-vazia" id="titulo-detalhe-chamado">{t("chamados.loading")}</p>}
        {chamado.isError && <div className="error-message" role="alert" id="titulo-detalhe-chamado">{mensagemDeErro(chamado.error)}</div>}
        {chamado.isSuccess && (
          <>
            <header className="dialogo-topo">
              <h2 id="titulo-detalhe-chamado" className="card-title" tabIndex={-1} ref={titulo}>
                {`${t(`chamados.types.${c.tipo}`, { defaultValue: c.tipo })} — ${c.maquinaNome}`}
              </h2>
              <span className={`selo selo-prioridade-${c.prioridade.toLowerCase()}`}>
                {t(`chamados.priorities.${c.prioridade}`, { defaultValue: c.prioridade })}
              </span>
            </header>
            <dl className="cartao-maquina-dados detalhe-dados">
              <div><dt>{t("chamados.status")}</dt><dd>{t(`chamados.statuses.${c.status}`, { defaultValue: c.status })}</dd></div>
              <div><dt>{t("chamados.openedByLabel")}</dt><dd>{c.abertoPor.nome}</dd></div>
              <div><dt>{t("chamados.openedAtDetail")}</dt><dd>{dataHora(c.abertoEm)}</dd></div>
              <div><dt>{t("chamados.location")}</dt><dd>{`${c.setor} · ${c.linha}`}</dd></div>
              {c.responsavel && <div><dt>{t("chamados.responsibleLabel")}</dt><dd>{c.responsavel.nome}</dd></div>}
            </dl>
            <h3 className="form-secao">{t("chamados.notes")}</h3>
            <p className="cartao-chamado-notas">{c.descricao}</p>
            {c.solucao && (<><h3 className="form-secao">{t("chamados.solution")}</h3><p className="cartao-chamado-notas">{c.solucao}</p></>)}
            {c.motivoCancelamento && (<><h3 className="form-secao">{t("chamados.cancelReason")}</h3><p className="cartao-chamado-notas">{c.motivoCancelamento}</p></>)}
            <h3 className="form-secao" id="titulo-historico">{t("chamados.history")}</h3>
            <ol className="historico-chamado" aria-label={t("chamados.history")}>
              {c.historico.map((e, i) => (
                <li key={`${e.em}-${i}`}>
                  <span className="historico-quando">{`${dataHora(e.em)} · ${e.por}`}</span>
                  <span>{e.texto}</span>
                </li>
              ))}
            </ol>
          </>
        )}
        <div className="form-acoes">
          <button type="button" className="btn-secundario" onClick={onFechar}>{t("common.close")}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
