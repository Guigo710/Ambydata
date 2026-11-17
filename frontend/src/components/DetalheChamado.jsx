import { useEffect, useRef } from "react";
import { mensagemDeErro } from "../services/api";
import { NOME_DA_PRIORIDADE, NOME_DO_STATUS, dataHora, tituloDoChamado, useChamado } from "../services/chamados";

// Detalhe do chamado com o histórico (abre pelo card ou pelo link da notificação).
// Diálogo acessível: foco no título ao abrir, Esc ou "Fechar" para sair.
export default function DetalheChamado({ id, onFechar }) {
  const chamado = useChamado(id);
  const titulo = useRef(null);

  useEffect(() => {
    const aoTeclar = (e) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  useEffect(() => {
    if (chamado.isSuccess) titulo.current?.focus();
  }, [chamado.isSuccess]);

  const c = chamado.data;
  return (
    <div className="fundo-dialogo" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="card dialogo" role="dialog" aria-modal="true" aria-labelledby="titulo-detalhe-chamado">
        {chamado.isPending && <p className="tabela-vazia" id="titulo-detalhe-chamado">Carregando chamado...</p>}
        {chamado.isError && <div className="error-message" role="alert" id="titulo-detalhe-chamado">{mensagemDeErro(chamado.error)}</div>}
        {chamado.isSuccess && (
          <>
            <header className="dialogo-topo">
              <h2 id="titulo-detalhe-chamado" className="card-title" tabIndex={-1} ref={titulo}>{tituloDoChamado(c)}</h2>
              <span className={`selo selo-prioridade-${c.prioridade.toLowerCase()}`}>{NOME_DA_PRIORIDADE[c.prioridade]}</span>
            </header>
            <dl className="cartao-maquina-dados detalhe-dados">
              <div><dt>Status</dt><dd>{NOME_DO_STATUS[c.status]}</dd></div>
              <div><dt>Aberto por</dt><dd>{c.abertoPor.nome}</dd></div>
              <div><dt>Aberto em</dt><dd>{dataHora(c.abertoEm)}</dd></div>
              <div><dt>Local</dt><dd>{`${c.setor} · ${c.linha}`}</dd></div>
              {c.responsavel && <div><dt>Responsável</dt><dd>{c.responsavel.nome}</dd></div>}
            </dl>
            <h3 className="form-secao">Notas</h3>
            <p className="cartao-chamado-notas">{c.descricao}</p>
            {c.solucao && (<><h3 className="form-secao">Solução</h3><p className="cartao-chamado-notas">{c.solucao}</p></>)}
            {c.motivoCancelamento && (<><h3 className="form-secao">Motivo do cancelamento</h3><p className="cartao-chamado-notas">{c.motivoCancelamento}</p></>)}
            <h3 className="form-secao" id="titulo-historico">Histórico</h3>
            <ol className="historico-chamado" aria-label="Histórico">
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
          <button type="button" className="btn-secundario" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
