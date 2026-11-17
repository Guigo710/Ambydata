import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../auth/contexto";
import MaquinaForm from "../components/MaquinaForm";
import { api, mensagemDeErro } from "../services/api";
import { CHAVE_MAQUINAS, TIPOS_DE_MAQUINA, formatarNumero, textoFaixa, useMaquinas } from "../services/maquinas";

// Cadastro das máquinas: o ENGENHEIRO cria, edita e desativa; o DIRETOR só consulta.
export default function Maquinas() {
  const { perfil } = useAuth();
  const podeEditar = perfil === "ENGENHEIRO";
  const queryClient = useQueryClient();
  const lista = useMaquinas();
  const [painel, setPainel] = useState(null); // null | { maquina? }
  const [aviso, setAviso] = useState(null);

  // Parâmetros da máquina mudam faixa, cadência, potência: os indicadores também se refazem.
  const atualizar = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAVE_MAQUINAS }),
    queryClient.invalidateQueries({ queryKey: ["indicadores"] }),
  ]);

  const salvar = useMutation({
    mutationFn: ({ id, ...dados }) => (id ? api.put(`/api/maquinas/${id}`, dados) : api.post("/api/maquinas", dados)),
    onSuccess: (_, { id }) => {
      setPainel(null);
      setAviso(id ? "Máquina atualizada." : "Máquina criada.");
      return atualizar();
    },
  });

  const alternarAtiva = useMutation({
    mutationFn: (maquina) => api.patch(`/api/maquinas/${maquina.id}/ativa`, { ativa: !maquina.ativa }),
    onSuccess: atualizar,
  });

  const abrir = (novo) => {
    salvar.reset();
    setAviso(null);
    setPainel(novo);
  };

  return (
    <>
      <div className="page-header usuarios-cabecalho">
        <div>
          <h1 className="page-title">Máquinas</h1>
          <p className="page-greeting">Parâmetros de produção e limites de alerta de cada máquina.</p>
        </div>
        {podeEditar && <button type="button" className="btn-primario" onClick={() => abrir({})}>Nova máquina</button>}
      </div>

      {aviso && <div className="success-message" role="status">{aviso}</div>}
      {alternarAtiva.isError && <div className="error-message" role="alert">{mensagemDeErro(alternarAtiva.error)}</div>}

      {painel && (
        <MaquinaForm
          key={painel.maquina?.id ?? "nova"}
          maquina={painel.maquina}
          pendente={salvar.isPending}
          erro={salvar.isError
            ? { mensagem: mensagemDeErro(salvar.error), campos: salvar.error?.response?.data?.campos }
            : null}
          onEnviar={(dados) => salvar.mutate(dados)}
          onCancelar={() => abrir(null)}
        />
      )}

      <section className="card">
        {lista.isPending && <p className="tabela-vazia">Carregando máquinas...</p>}
        {lista.isError && <div className="error-message" role="alert">{mensagemDeErro(lista.error)}</div>}
        {lista.isSuccess && (
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Máquina</th>
                <th scope="col">Setor</th>
                <th scope="col">Linha</th>
                <th scope="col">Faixa permitida</th>
                <th scope="col">Crítico</th>
                <th scope="col">Situação</th>
                {podeEditar && <th scope="col"><span className="sr-only">Ações</span></th>}
              </tr>
            </thead>
            <tbody>
              {lista.data.map((m) => (
                <tr key={m.id} className={m.ativa ? "" : "linha-inativa"}>
                  <td>
                    {m.nome}
                    <span className="tabela-detalhe">{TIPOS_DE_MAQUINA[m.tipo] ?? m.tipo} · {m.cadenciaIdeal} peças/min</span>
                  </td>
                  <td>{m.setor}</td>
                  <td>{m.linha}</td>
                  <td>{textoFaixa(m.faixaTemperatura)}</td>
                  <td>{`abaixo de ${formatarNumero(m.limiteCritico.min)} / acima de ${formatarNumero(m.limiteCritico.max)} °C`}</td>
                  <td>
                    <span className={`situacao ${m.ativa ? "situacao-ativo" : "situacao-inativo"}`}>{m.ativa ? "Ativa" : "Inativa"}</span>
                  </td>
                  {podeEditar && (
                    <td className="tabela-acoes">
                      <button type="button" className="btn-link" onClick={() => abrir({ maquina: m })}>Editar</button>
                      <button type="button" className="btn-link" disabled={alternarAtiva.isPending}
                        onClick={() => { setAviso(null); alternarAtiva.mutate(m); }}>
                        {m.ativa ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
