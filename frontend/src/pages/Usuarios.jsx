import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../auth/contexto";
import { NOME_DO_PERFIL } from "../auth/permissoes";
import RedefinirSenhaForm from "../components/RedefinirSenhaForm";
import UsuarioForm from "../components/UsuarioForm";
import { api, mensagemDeErro } from "../services/api";

const CHAVE = ["usuarios"];

// Gestão de usuários pelo ADMIN: lista, criação, edição, ativação e redefinição de senha.
export default function Usuarios() {
  const { usuario: eu, atualizarUsuario } = useAuth();
  const queryClient = useQueryClient();
  // null | { tipo: "novo" } | { tipo: "editar", usuario } | { tipo: "senha", usuario }
  const [painel, setPainel] = useState(null);
  const [aviso, setAviso] = useState(null);

  const lista = useQuery({
    queryKey: CHAVE,
    queryFn: () => api.get("/api/usuarios").then((resposta) => resposta.data),
  });

  const atualizarLista = () => queryClient.invalidateQueries({ queryKey: CHAVE });

  const salvar = useMutation({
    mutationFn: ({ id, ...dados }) => (id ? api.put(`/api/usuarios/${id}`, dados) : api.post("/api/usuarios", dados)),
    onSuccess: (resposta, { id }) => {
      if (id && id === eu?.id) {
        atualizarUsuario(resposta.data); // o ADMIN editou a si mesmo: topo e menu acompanham
      }
      setPainel(null);
      setAviso(id ? "Usuário atualizado." : "Usuário criado.");
      return atualizarLista();
    },
  });

  const alternarAtivo = useMutation({
    mutationFn: (usuario) => api.patch(`/api/usuarios/${usuario.id}/ativo`, { ativo: !usuario.ativo }),
    onSuccess: atualizarLista,
  });

  const redefinir = useMutation({
    mutationFn: ({ id, novaSenha }) => api.put(`/api/usuarios/${id}/senha`, { novaSenha }),
    onSuccess: (_, { nome }) => {
      setAviso(`Senha de ${nome} redefinida. Informe a nova senha à pessoa.`);
      setPainel(null);
    },
  });

  const abrir = (novoPainel) => {
    salvar.reset();
    redefinir.reset();
    alternarAtivo.reset();
    setAviso(null);
    setPainel(novoPainel);
  };

  return (
    <>
      <div className="page-header usuarios-cabecalho">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-greeting">Cadastre, edite e desative quem acessa o AmbyData.</p>
        </div>
        <button type="button" className="btn-primario" onClick={() => abrir({ tipo: "novo" })}>Novo usuário</button>
      </div>

      {aviso && <div className="success-message" role="status">{aviso}</div>}
      {alternarAtivo.isError && <div className="error-message" role="alert">{mensagemDeErro(alternarAtivo.error)}</div>}

      {(painel?.tipo === "novo" || painel?.tipo === "editar") && (
        <UsuarioForm
          key={painel.usuario?.id ?? "novo"}
          usuario={painel.usuario}
          pendente={salvar.isPending}
          erro={salvar.isError ? mensagemDeErro(salvar.error) : null}
          onEnviar={(dados) => salvar.mutate(dados)}
          onCancelar={() => abrir(null)}
        />
      )}
      {painel?.tipo === "senha" && (
        <RedefinirSenhaForm
          key={painel.usuario.id}
          usuario={painel.usuario}
          pendente={redefinir.isPending}
          erro={redefinir.isError ? mensagemDeErro(redefinir.error) : null}
          onEnviar={(dados) => redefinir.mutate({ ...dados, nome: painel.usuario.nome })}
          onCancelar={() => abrir(null)}
        />
      )}

      <section className="card">
        {lista.isPending && <p className="tabela-vazia">Carregando usuários...</p>}
        {lista.isError && <div className="error-message" role="alert">{mensagemDeErro(lista.error)}</div>}
        {lista.isSuccess && (
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Perfil</th>
                <th scope="col">Situação</th>
                <th scope="col"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.data.map((usuario) => {
                const souEu = usuario.id === eu?.id;
                return (
                  <tr key={usuario.id} className={usuario.ativo ? "" : "linha-inativa"}>
                    <td>{usuario.nome}</td>
                    <td>{usuario.email}</td>
                    <td>{NOME_DO_PERFIL[usuario.perfil] ?? usuario.perfil}</td>
                    <td>
                      <span className={`situacao ${usuario.ativo ? "situacao-ativo" : "situacao-inativo"}`}>
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="tabela-acoes">
                      <button type="button" className="btn-link" onClick={() => abrir({ tipo: "editar", usuario })}>
                        Editar
                      </button>
                      <button type="button" className="btn-link" onClick={() => abrir({ tipo: "senha", usuario })}>
                        Redefinir senha
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        disabled={souEu || alternarAtivo.isPending}
                        title={souEu ? "Você não pode desativar o próprio usuário." : undefined}
                        onClick={() => { setAviso(null); alternarAtivo.mutate(usuario); }}
                      >
                        {usuario.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
