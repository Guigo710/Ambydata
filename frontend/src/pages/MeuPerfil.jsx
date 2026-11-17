import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../auth/contexto";
import { NOME_DO_PERFIL } from "../auth/permissoes";
import { api, mensagemDeErro } from "../services/api";

const VAZIO = { senhaAtual: "", novaSenha: "", confirmacao: "" };

// Mesma regra do backend: 8 a 72 caracteres (e no máximo 72 bytes, conferido lá).
function validar({ novaSenha, confirmacao }) {
  if (novaSenha.length < 8 || novaSenha.length > 72) {
    return "A nova senha precisa ter entre 8 e 72 caracteres.";
  }
  if (novaSenha !== confirmacao) {
    return "A confirmação não confere com a nova senha.";
  }
  return null;
}

// Dados do usuário logado e troca da própria senha.
export default function MeuPerfil() {
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
    const problema = validar(campos);
    setErroLocal(problema);
    if (!problema) {
      trocarSenha.mutate(campos);
    }
  };

  const erro = erroLocal ?? (trocarSenha.isError ? mensagemDeErro(trocarSenha.error) : null);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Meu perfil</h1>
      </div>

      <div className="perfil-grid">
        <section className="card" aria-labelledby="titulo-dados">
          <h2 id="titulo-dados" className="card-title">Seus dados</h2>
          <dl className="perfil-dados">
            <dt>Nome</dt>
            <dd>{usuario?.nome}</dd>
            <dt>E-mail</dt>
            <dd>{usuario?.email}</dd>
            <dt>Perfil</dt>
            <dd>{NOME_DO_PERFIL[perfil]}</dd>
          </dl>
          <p className="perfil-nota">Para mudar nome, e-mail ou perfil, procure o administrador.</p>
        </section>

        <section className="card" aria-labelledby="titulo-senha">
          <h2 id="titulo-senha" className="card-title">Trocar senha</h2>
          <form onSubmit={enviar} className="form-senha" noValidate>
            {erro && <div className="error-message" role="alert">{erro}</div>}
            {trocarSenha.isSuccess && <div className="success-message" role="status">Senha alterada com sucesso.</div>}

            <div className="input-group">
              <label htmlFor="senhaAtual">Senha atual</label>
              <input id="senhaAtual" type="password" autoComplete="current-password"
                value={campos.senhaAtual} onChange={alterar("senhaAtual")} required />
            </div>
            <div className="input-group">
              <label htmlFor="novaSenha">Nova senha</label>
              <input id="novaSenha" type="password" autoComplete="new-password"
                value={campos.novaSenha} onChange={alterar("novaSenha")} required />
            </div>
            <div className="input-group">
              <label htmlFor="confirmacao">Confirme a nova senha</label>
              <input id="confirmacao" type="password" autoComplete="new-password"
                value={campos.confirmacao} onChange={alterar("confirmacao")} required />
            </div>

            <button type="submit" className="login-btn" disabled={trocarSenha.isPending}>
              {trocarSenha.isPending ? "Alterando..." : "Alterar senha"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
