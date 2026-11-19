import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useAuth } from "../auth/contexto";
import RedefinirSenhaForm from "../components/RedefinirSenhaForm";
import UsuarioForm from "../components/UsuarioForm";
import { api, mensagemDeErro } from "../services/api";

const CHAVE = ["usuarios"];

// Gestão de usuários pelo ADMIN: lista, criação, edição, ativação e redefinição de senha.
export default function Usuarios() {
  const { t } = useTranslation();
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
      setAviso(id ? t("pages.users.updated") : t("pages.users.created"));
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
      setAviso(t("pages.users.passwordReset", { name: nome }));
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
          <h1 className="page-title">{t("pages.users.title")}</h1>
          <p className="page-greeting">{t("pages.users.subtitle")}</p>
        </div>
        <button type="button" className="btn-primario" onClick={() => abrir({ tipo: "novo" })}>{t("users.new")}</button>
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
        {lista.isPending && <p className="tabela-vazia">{t("pages.users.loading")}</p>}
        {lista.isError && <div className="error-message" role="alert">{mensagemDeErro(lista.error)}</div>}
        {lista.isSuccess && (
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">{t("users.name")}</th>
                <th scope="col">{t("users.email")}</th>
                <th scope="col">{t("users.role")}</th>
                <th scope="col">{t("pages.users.situation")}</th>
                <th scope="col"><span className="sr-only">{t("common.actions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.data.map((usuario) => {
                const souEu = usuario.id === eu?.id;
                return (
                  <tr key={usuario.id} className={usuario.ativo ? "" : "linha-inativa"}>
                    <td>{usuario.nome}</td>
                    <td>{usuario.email}</td>
                    <td>{t(`users.roles.${usuario.perfil}`, { defaultValue: usuario.perfil })}</td>
                    <td>
                      <span className={`situacao ${usuario.ativo ? "situacao-ativo" : "situacao-inativo"}`}>
                        {usuario.ativo ? t("pages.users.active") : t("pages.users.inactive")}
                      </span>
                    </td>
                    <td className="tabela-acoes">
                      <button type="button" className="btn-link" onClick={() => abrir({ tipo: "editar", usuario })}>
                        {t("pages.users.edit")}
                      </button>
                      <button type="button" className="btn-link" onClick={() => abrir({ tipo: "senha", usuario })}>
                        {t("pages.users.resetPassword")}
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        disabled={souEu || alternarAtivo.isPending}
                        title={souEu ? t("pages.users.cannotDeactivateSelf") : undefined}
                        onClick={() => { setAviso(null); alternarAtivo.mutate(usuario); }}
                      >
                        {usuario.ativo ? t("pages.users.deactivate") : t("pages.users.activate")}
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
