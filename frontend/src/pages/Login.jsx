import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/contexto";
import { rotaInicial } from "../auth/permissoes";
import { mensagemDeErro } from "../services/api";

export default function Login() {
  const { login, aviso } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [informacao, setInformacao] = useState("");
  const [carregando, setCarregando] = useState(false);

  const entrar = async (evento) => {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const usuario = await login(email, senha);
      navigate(rotaInicial(usuario.perfil), { replace: true });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo">
          <img src="/ambydata-logo.webp" alt="Logo Ambydata Technology" className="login-logo-img"
            width="180"
            height="60"
            fetchPriority="high" />
        </div>

        <form onSubmit={entrar} className="login-form">
          <h3>Acesso ao Sistema</h3>
          <p className="login-subtitle">Monitore seus dados em tempo real</p>

          {aviso && !erro && <div className="info-message">{aviso}</div>}
          {erro && <div className="error-message" role="alert">{erro}</div>}

          <div className="input-group">
            <label htmlFor="email">Usuário (E-mail)</label>
            <input
              type="email"
              id="email"
              placeholder="Digite seu e-mail"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="senha">Senha</label>
            <input
              type="password"
              id="senha"
              placeholder="Digite sua senha"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <div className="login-actions">
            <button type="button" className="forgot-link"
              onClick={() => setInformacao("Procure seu gestor para redefinir sua senha.")}>
              Esqueci minha senha
            </button>
          </div>
          {informacao && <div className="info-message">{informacao}</div>}

          <button type="submit" className="login-btn" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
