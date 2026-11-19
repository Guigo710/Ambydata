import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { tempoDesde, useRelogio } from "../services/indicadores";
import { CHAVE_NOTIFICACOES, linkSeguro, useNotificacoes } from "../services/notificacoes";

// Sino da barra superior (OPERARIO, ENGENHEIRO, DIRETOR): número de não lidas e a lista; clicar
// num aviso marca como lido e abre o chamado. Esc ou clique fora fecham.
export default function SinoNotificacoes() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const relogio = useRelogio(30_000);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);
  const botao = useRef(null);
  const notificacoes = useNotificacoes(true);
  const naoLidas = notificacoes.data?.naoLidas ?? 0;
  const itens = notificacoes.data?.itens ?? [];

  const atualizar = () => queryClient.invalidateQueries({ queryKey: CHAVE_NOTIFICACOES });
  const marcarTodas = useMutation({ mutationFn: () => api.post("/api/notificacoes/lidas"), onSettled: atualizar });
  const marcarLida = useMutation({ mutationFn: (id) => api.post(`/api/notificacoes/${id}/lida`), onSettled: atualizar });

  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (e) => {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    };
    const aoClicarFora = (e) => caixa.current && !caixa.current.contains(e.target) && setAberto(false);
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto]);

  const rotulo = naoLidas === 0 ? t("notifications.buttonZero") : t("notifications.button", { count: naoLidas });

  return (
    <div className="sino" ref={caixa}>
      <button type="button" ref={botao} className="topbar-icon" aria-label={rotulo} title={rotulo}
        aria-expanded={aberto} aria-controls="painel-notificacoes" onClick={() => setAberto(!aberto)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {naoLidas > 0 && <span className="sino-contador" aria-hidden="true">{naoLidas > 9 ? "9+" : naoLidas}</span>}
      </button>

      {aberto && (
        <section id="painel-notificacoes" className="card painel-notificacoes" aria-label={t("notifications.title")}>
          <header className="painel-notificacoes-topo">
            <h2 className="card-title">{t("notifications.title")}</h2>
            {naoLidas > 0 && (
              <button type="button" className="btn-link" onClick={() => marcarTodas.mutate()}>{t("notifications.markAllRead")}</button>
            )}
          </header>
          {itens.length === 0 ? (
            <p className="tabela-vazia">{t("notifications.empty")}</p>
          ) : (
            <ul className="lista-notificacoes">
              {itens.map((n) => (
                <li key={n.id} className={n.lida ? "" : "nao-lida"}>
                  <Link to={linkSeguro(n.link)} onClick={() => {
                    if (!n.lida) marcarLida.mutate(n.id);
                    setAberto(false);
                  }}>
                    {n.lida ? n.texto : <><span className="sr-only">{t("notifications.unread")}</span>{n.texto}</>}
                  </Link>
                  <span className="notificacao-quando">{tempoDesde(n.criadaEm, relogio, t)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
