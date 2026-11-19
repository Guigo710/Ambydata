import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import logoAmbydata from "../assets/ambydata-logo.png";
import { useAuth } from "../auth/contexto";
import { rotaInicial } from "../auth/permissoes";
import { mensagemDeErro } from "../services/api";

export default function Login() {
  const { t } = useTranslation();
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
          <img src={logoAmbydata} alt={t("login.logoAlt")} className="login-logo-img" />
        </div>

        <form onSubmit={entrar} className="login-form">
          <h3>{t("login.title")}</h3>
          <p className="login-subtitle">{t("login.subtitle")}</p>

          {aviso && !erro && <div className="info-message">{aviso}</div>}
          {erro && <div className="error-message" role="alert">{erro}</div>}

          <div className="input-group">
            <label htmlFor="email">{t("login.emailLabel")}</label>
            <input
              type="email"
              id="email"
              placeholder={t("login.emailPlaceholder")}
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="senha">{t("login.password")}</label>
            <input
              type="password"
              id="senha"
              placeholder={t("login.passwordPlaceholder")}
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <div className="login-actions">
            <button type="button" className="forgot-link"
              onClick={() => setInformacao(t("login.forgotInfo"))}>
              {t("login.forgot")}
            </button>
          </div>
          {informacao && <div className="info-message">{informacao}</div>}

          <button type="submit" className="login-btn" disabled={carregando}>
            {carregando ? t("login.loading") : t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
