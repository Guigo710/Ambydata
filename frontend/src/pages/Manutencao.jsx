import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/contexto";
import AcoesChamado from "../components/AcoesChamado";
import CartaoChamado from "../components/CartaoChamado";
import DetalheChamado from "../components/DetalheChamado";
import FormChamado from "../components/FormChamado";
import SeletorMaquina from "../components/SeletorMaquina";
import { mensagemDeErro } from "../services/api";
import { colunasDoKanban, useChamados } from "../services/chamados";
import { useMaquinaSelecionada } from "../services/maquinas";

const COLUNAS = [
  ["abertos", "pages.maintenance.open"],
  ["emAndamento", "pages.maintenance.inProgress"],
  ["finalizados", "pages.maintenance.completed"],
];

function Coluna({ titulo, chamados, podeAgir, onVer, onErro }) {
  const { t } = useTranslation();
  return (
    <section className="coluna-kanban" aria-label={t(titulo)}>
      <h2 className="coluna-kanban-titulo">
        {t(titulo)} <span className="coluna-kanban-contador">{chamados.length}</span>
      </h2>
      {chamados.length === 0
        ? <p className="tabela-vazia">{t("pages.maintenance.empty")}</p>
        : chamados.map((c) => (
          <CartaoChamado key={c.id} chamado={c}>
            <div className="cartao-chamado-rodape">
              <button type="button" className="btn-link" onClick={() => onVer(c.id)}>{t("pages.maintenance.details")}</button>
            </div>
            {podeAgir && <AcoesChamado chamado={c} onErro={onErro} />}
          </CartaoChamado>
        ))}
    </section>
  );
}

// Report de Manutenção: kanban dos chamados (SPEC-chamados). O card muda de coluna sozinho
// conforme o status; a tela busca de novo a cada 10 s. ?chamado=<id> abre o detalhe (link das
// notificações).
export default function Manutencao() {
  const { t } = useTranslation();
  const { perfil } = useAuth();
  const selecao = useMaquinaSelecionada({ permitirTodas: true });
  const chamados = useChamados(selecao.maquina?.id);
  const [parametros, setParametros] = useSearchParams();
  const [formAberto, setFormAberto] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const botaoAbrir = useRef(null);
  const colunas = useMemo(() => (chamados.data ? colunasDoKanban(chamados.data) : null), [chamados.data]);
  const podeAbrir = perfil === "OPERARIO" || perfil === "ENGENHEIRO";
  const podeAgir = perfil === "ENGENHEIRO";
  const detalhe = parametros.get("chamado");

  // Abrir entra no histórico do navegador; fechar substitui (o Voltar não reabre o detalhe).
  const verDetalhe = useCallback((id) => setParametros((atuais) => {
    const novos = new URLSearchParams(atuais);
    if (id) novos.set("chamado", id);
    else novos.delete("chamado");
    return novos;
  }, { replace: !id }), [setParametros]);
  const fecharForm = () => {
    setFormAberto(false);
    botaoAbrir.current?.focus();
  };
  const fecharDetalhe = useCallback(() => verDetalhe(null), [verDetalhe]);

  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">{t("pages.maintenance.title")}</h1>
          <p className="page-greeting">{t("pages.maintenance.subtitle")}</p>
        </div>
        <div className="cabecalho-acoes">
          {podeAbrir && (
            <button type="button" ref={botaoAbrir} className="btn-primario" aria-expanded={formAberto} aria-controls="form-chamado"
              onClick={() => { setAviso(null); setFormAberto(true); }}>{t("chamados.open")}</button>
          )}
          <SeletorMaquina selecao={selecao} permitirTodas />
        </div>
      </div>

      {aviso && <div className="success-message" role="status">{aviso}</div>}
      {erroAcao && <div className="error-message" role="alert">{erroAcao}</div>}
      {formAberto && (
        <FormChamado maquinas={selecao.maquinas} maquinaInicial={selecao.maquina?.id} onFechar={fecharForm}
          onAberto={() => { fecharForm(); setAviso(t("pages.maintenance.opened")); }} />
      )}

      {chamados.isPending && <p className="tabela-vazia">{t("pages.maintenance.loading")}</p>}
      {chamados.isError && <div className="error-message" role="alert">{mensagemDeErro(chamados.error)}</div>}
      {colunas && (
        <div className="kanban">
          {COLUNAS.map(([chave, titulo]) => (
            <Coluna key={chave} titulo={titulo} chamados={colunas[chave]} podeAgir={podeAgir} onVer={verDetalhe} onErro={setErroAcao} />
          ))}
        </div>
      )}

      {detalhe && <DetalheChamado id={detalhe} onFechar={fecharDetalhe} />}
    </>
  );
}
