import { useTranslation } from "react-i18next";
import { useState } from "react";
import { PERFIS } from "../auth/permissoes";

// Formulário de criação e edição de usuário pelo ADMIN. Na criação pede a senha
// inicial; na edição a senha muda só por "Redefinir senha".
export default function UsuarioForm({ usuario, pendente, erro, onEnviar, onCancelar }) {
  const { t } = useTranslation();
  const criando = !usuario;
  const [campos, setCampos] = useState({
    nome: usuario?.nome ?? "",
    email: usuario?.email ?? "",
    perfil: usuario?.perfil ?? "OPERARIO",
    senha: "",
  });
  const [erroLocal, setErroLocal] = useState(null);

  const alterar = (nome) => (evento) => setCampos({ ...campos, [nome]: evento.target.value });

  const enviar = (evento) => {
    evento.preventDefault();
    const dados = { nome: campos.nome.trim(), email: campos.email.trim(), perfil: campos.perfil };
    if (!dados.nome || !dados.email) {
      setErroLocal(t("users.fillNameEmail"));
      return;
    }
    if (criando && (campos.senha.length < 8 || campos.senha.length > 72)) {
      setErroLocal(t("users.passwordLength"));
      return;
    }
    setErroLocal(null);
    onEnviar(criando ? { ...dados, senha: campos.senha } : { id: usuario.id, ...dados });
  };

  const mensagem = erroLocal ?? erro;

  return (
    <section className="card painel-form" aria-labelledby="titulo-form-usuario">
      <h2 id="titulo-form-usuario" className="card-title">
        {criando ? t("users.new") : t("users.edit", { name: usuario.nome })}
      </h2>
      <form onSubmit={enviar} noValidate>
        {mensagem && <div className="error-message" role="alert">{mensagem}</div>}
        <div className="form-colunas">
          <div className="input-group">
            <label htmlFor="usuario-nome">{t("users.name")}</label>
            <input id="usuario-nome" value={campos.nome} onChange={alterar("nome")} required />
          </div>
          <div className="input-group">
            <label htmlFor="usuario-email">{t("users.email")}</label>
            <input id="usuario-email" type="email" value={campos.email} onChange={alterar("email")} required />
          </div>
          <div className="input-group">
            <label htmlFor="usuario-perfil">{t("users.role")}</label>
            <select id="usuario-perfil" value={campos.perfil} onChange={alterar("perfil")}>
              {PERFIS.map((perfil) => (
                <option key={perfil} value={perfil}>{t(`users.roles.${perfil}`, { defaultValue: perfil })}</option>
              ))}
            </select>
          </div>
          {criando && (
            <div className="input-group">
              <label htmlFor="usuario-senha">{t("users.initialPassword")}</label>
              <input id="usuario-senha" type="password" autoComplete="new-password"
                value={campos.senha} onChange={alterar("senha")} required />
            </div>
          )}
        </div>
        <div className="form-acoes">
          <button type="button" className="btn-secundario" onClick={onCancelar}>{t("users.cancel")}</button>
          <button type="submit" className="btn-primario" disabled={pendente}>
            {pendente ? t("users.saving") : t("users.save")}
          </button>
        </div>
      </form>
    </section>
  );
}
