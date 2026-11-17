import { useCallback, useState } from "react";
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
  ["abertos", "Abertos"],
  ["emAndamento", "Em andamento"],
  ["finalizados", "Finalizados"],
];

function Coluna({ titulo, chamados, podeAgir, onVer }) {
  return (
    <section className="coluna-kanban" aria-label={titulo}>
      <h2 className="coluna-kanban-titulo">
        {titulo} <span className="coluna-kanban-contador">{chamados.length}</span>
      </h2>
      {chamados.length === 0
        ? <p className="tabela-vazia">Nenhum chamado</p>
        : chamados.map((c) => (
          <CartaoChamado key={c.id} chamado={c}>
            <div className="cartao-chamado-rodape">
              <button type="button" className="btn-link" onClick={() => onVer(c.id)}>Ver detalhes</button>
            </div>
            {podeAgir && <AcoesChamado chamado={c} />}
          </CartaoChamado>
        ))}
    </section>
  );
}

// Report de Manutenção: kanban dos chamados (SPEC-chamados). O card muda de coluna sozinho
// conforme o status; a tela busca de novo a cada 10 s. ?chamado=<id> abre o detalhe (link das
// notificações).
export default function Manutencao() {
  const { perfil } = useAuth();
  const selecao = useMaquinaSelecionada({ permitirTodas: true });
  const chamados = useChamados(selecao.maquina?.id);
  const [parametros, setParametros] = useSearchParams();
  const [formAberto, setFormAberto] = useState(false);
  const [aviso, setAviso] = useState(null);
  const podeAbrir = perfil === "OPERARIO" || perfil === "ENGENHEIRO";
  const podeAgir = perfil === "ENGENHEIRO";
  const detalhe = parametros.get("chamado");

  const verDetalhe = useCallback((id) => setParametros((atuais) => {
    const novos = new URLSearchParams(atuais);
    if (id) novos.set("chamado", id);
    else novos.delete("chamado");
    return novos;
  }), [setParametros]);
  const fecharDetalhe = useCallback(() => verDetalhe(null), [verDetalhe]);

  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">Report de Manutenção</h1>
          <p className="page-greeting">Chamados abertos, em andamento e finalizados nos últimos 7 dias</p>
        </div>
        <div className="cabecalho-acoes">
          {podeAbrir && !formAberto && (
            <button type="button" className="btn-primario" onClick={() => { setAviso(null); setFormAberto(true); }}>Abrir chamado</button>
          )}
          <SeletorMaquina selecao={selecao} permitirTodas />
        </div>
      </div>

      {aviso && <div className="success-message" role="status">{aviso}</div>}
      {formAberto && (
        <FormChamado maquinas={selecao.maquinas} maquinaInicial={selecao.maquina?.id} onFechar={() => setFormAberto(false)}
          onAberto={() => { setFormAberto(false); setAviso("Chamado aberto."); }} />
      )}

      {chamados.isPending && <p className="tabela-vazia">Carregando chamados...</p>}
      {chamados.isError && <div className="error-message" role="alert">{mensagemDeErro(chamados.error)}</div>}
      {chamados.isSuccess && (
        <div className="kanban">
          {COLUNAS.map(([chave, titulo]) => (
            <Coluna key={chave} titulo={titulo} chamados={colunasDoKanban(chamados.data)[chave]} podeAgir={podeAgir} onVer={verDetalhe} />
          ))}
        </div>
      )}

      {detalhe && <DetalheChamado id={detalhe} onFechar={fecharDetalhe} />}
    </>
  );
}
