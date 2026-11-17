import CartaoChamado from "../components/CartaoChamado";
import SeletorMaquina from "../components/SeletorMaquina";
import { mensagemDeErro } from "../services/api";
import { colunasDoKanban, useChamados } from "../services/chamados";
import { useMaquinaSelecionada } from "../services/maquinas";

const COLUNAS = [
  ["abertos", "Abertos"],
  ["emAndamento", "Em andamento"],
  ["finalizados", "Finalizados"],
];

function Coluna({ titulo, chamados }) {
  return (
    <section className="coluna-kanban" aria-label={titulo}>
      <h2 className="coluna-kanban-titulo">
        {titulo} <span className="coluna-kanban-contador">{chamados.length}</span>
      </h2>
      {chamados.length === 0
        ? <p className="tabela-vazia">Nenhum chamado</p>
        : chamados.map((c) => <CartaoChamado key={c.id} chamado={c} />)}
    </section>
  );
}

// Report de Manutenção: kanban dos chamados (SPEC-chamados). O card muda de coluna sozinho
// conforme o status; a tela busca de novo a cada 10 s.
export default function Manutencao() {
  const selecao = useMaquinaSelecionada({ permitirTodas: true });
  const chamados = useChamados(selecao.maquina?.id);

  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">Report de Manutenção</h1>
          <p className="page-greeting">Chamados abertos, em andamento e finalizados nos últimos 7 dias</p>
        </div>
        <SeletorMaquina selecao={selecao} permitirTodas />
      </div>
      {chamados.isPending && <p className="tabela-vazia">Carregando chamados...</p>}
      {chamados.isError && <div className="error-message" role="alert">{mensagemDeErro(chamados.error)}</div>}
      {chamados.isSuccess && (
        <div className="kanban">
          {COLUNAS.map(([chave, titulo]) => (
            <Coluna key={chave} titulo={titulo} chamados={colunasDoKanban(chamados.data)[chave]} />
          ))}
        </div>
      )}
    </>
  );
}
