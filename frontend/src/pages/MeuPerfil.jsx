import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useAuth } from "../auth/contexto";
import { api, mensagemDeErro } from "../services/api";

const VAZIO = { senhaAtual: "", novaSenha: "", confirmacao: "" };

// Mesma regra do backend: 8 a 72 caracteres (e no máximo 72 bytes, conferido lá).
function validar({ novaSenha, confirmacao }, t) {
  if (novaSenha.length < 8 || novaSenha.length > 72) {
    return t("pages.profile.passwordLength");
  }
  if (novaSenha !== confirmacao) {
    return t("pages.profile.passwordMismatch");
  }
  return null;
}

// Dados do usuário logado e troca da própria senha.
export default function MeuPerfil() {
  const { t } = useTranslation();
  const { usuario, perfil } = useAuth();
  const [campos, setCampos] = useState(VAZIO);
  const [erroLocal, setErroLocal] = useState(null);

  const trocarSenha = useMutation({
    mutationFn: ({ senhaAtual, novaSenha }) => api.put("/api/auth/me/senha", { senhaAtual, novaSenha }),
    onSuccess: () => setCampos(VAZIO),
  });

  const alterar = (nome) => (evento) => setCampos({ ...campos, [nome]: evento.target.value });

  const enviar = (evento) => {
    evento.preventDefault();
    trocarSenha.reset();
    const problema = validar(campos, t);
    setErroLocal(problema);
    if (!problema) {
      trocarSenha.mutate(campos);
    }
  };

  const erro = erroLocal ?? (trocarSenha.isError ? mensagemDeErro(trocarSenha.error) : null);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{t("pages.profile.title")}</h1>
      </div>

      <div className="perfil-grid">
        <section className="card" aria-labelledby="titulo-dados">
          <h2 id="titulo-dados" className="card-title">{t("pages.profile.details")}</h2>
          <dl className="perfil-dados">
            <dt>{t("pages.profile.name")}</dt>
            <dd>{usuario?.nome}</dd>
            <dt>{t("pages.profile.email")}</dt>
            <dd>{usuario?.email}</dd>
            <dt>{t("pages.profile.role")}</dt>
            <dd>{t(`users.roles.${perfil}`, { defaultValue: perfil })}</dd>
          </dl>
          <p className="perfil-nota">{t("pages.profile.note")}</p>
        </section>

        <section className="card" aria-labelledby="titulo-senha">
          <h2 id="titulo-senha" className="card-title">{t("pages.profile.changePassword")}</h2>
          <form onSubmit={enviar} className="form-senha" noValidate>
            {erro && <div className="error-message" role="alert">{erro}</div>}
            {trocarSenha.isSuccess && <div className="success-message" role="status">{t("pages.profile.passwordChanged")}</div>}

            <div className="input-group">
              <label htmlFor="senhaAtual">{t("pages.profile.currentPassword")}</label>
              <input id="senhaAtual" type="password" autoComplete="current-password"
                value={campos.senhaAtual} onChange={alterar("senhaAtual")} required />
            </div>
            <div className="input-group">
              <label htmlFor="novaSenha">{t("pages.profile.newPassword")}</label>
              <input id="novaSenha" type="password" autoComplete="new-password"
                value={campos.novaSenha} onChange={alterar("novaSenha")} required />
            </div>
            <div className="input-group">
              <label htmlFor="confirmacao">{t("pages.profile.confirmPassword")}</label>
              <input id="confirmacao" type="password" autoComplete="new-password"
                value={campos.confirmacao} onChange={alterar("confirmacao")} required />
            </div>

            <button type="submit" className="login-btn" disabled={trocarSenha.isPending}>
              {trocarSenha.isPending ? t("pages.profile.changing") : t("pages.profile.change")}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
