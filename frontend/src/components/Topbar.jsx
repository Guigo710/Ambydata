import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/contexto";
import SinoNotificacoes from "./SinoNotificacoes";

// Barra superior: sino de notificações (produção), quem está logado, "Meu perfil" e Sair.
export default function Topbar() {
  const { t, i18n } = useTranslation();
  const { usuario, perfil, logout } = useAuth();
  const navigate = useNavigate();
  const etiqueta = perfil
    ? { nome: t(`users.roles.${perfil}`, { defaultValue: t("users.noRole") }), classe: `tag-${perfil.toLowerCase()}` }
    : { nome: t("users.noRole"), classe: "tag-padrao" };

  const sair = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-left" />

      <div className="topbar-right">
        {["OPERARIO", "ENGENHEIRO", "DIRETOR"].includes(perfil) && <SinoNotificacoes />}
        <label className="seletor-idioma">
          <span className="sr-only">{t("common.language")}</span>
          <select
            aria-label={t("common.language")}
            value={i18n.resolvedLanguage ?? i18n.language}
            onChange={(evento) => i18n.changeLanguage(evento.target.value)}
          >
            <option value="pt-BR">Português</option>
            <option value="en">English</option>
          </select>
        </label>
        <Link to="/meu-perfil" className="user-profile-box" title={t("users.myProfile")}>
          <div className="user-text-info">
            <span className="user-name">{usuario?.nome}</span>
            <span className={`user-role-badge ${etiqueta.classe}`}>{etiqueta.nome}</span>
          </div>
          <span className="topbar-icon profile-active" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
        </Link>

        <button type="button" className="topbar-icon" title={t("nav.sair")} aria-label={t("nav.sair")} onClick={sair}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
