import { useTranslation } from "react-i18next";
import { useState } from "react";

// O ADMIN define uma senha provisória para quem esqueceu a sua ("Procure seu gestor").
export default function RedefinirSenhaForm({ usuario, pendente, erro, onEnviar, onCancelar }) {
  const { t } = useTranslation();
  const [novaSenha, setNovaSenha] = useState("");
  const [erroLocal, setErroLocal] = useState(null);

  const enviar = (evento) => {
    evento.preventDefault();
    if (novaSenha.length < 8 || novaSenha.length > 72) {
      setErroLocal(t("users.passwordLength"));
      return;
    }
    setErroLocal(null);
    onEnviar({ id: usuario.id, novaSenha });
  };

  const mensagem = erroLocal ?? erro;

  return (
    <section className="card painel-form" aria-labelledby="titulo-redefinir">
      <h2 id="titulo-redefinir" className="card-title">{t("users.resetPassword", { name: usuario.nome })}</h2>
      <form onSubmit={enviar} noValidate>
        {mensagem && <div className="error-message" role="alert">{mensagem}</div>}
        <div className="input-group">
          <label htmlFor="redefinir-senha">{t("users.newPassword")}</label>
          <input id="redefinir-senha" type="password" autoComplete="new-password"
            value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
        </div>
        <div className="form-acoes">
          <button type="button" className="btn-secundario" onClick={onCancelar}>{t("users.cancel")}</button>
          <button type="submit" className="btn-primario" disabled={pendente}>
            {pendente ? t("users.resetting") : t("users.reset")}
          </button>
        </div>
      </form>
    </section>
  );
}
