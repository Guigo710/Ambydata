import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/contexto";

const PERFIS = {
  OPERARIO: { nome: "Operário", classe: "tag-operario" },
  ENGENHEIRO: { nome: "Engenheiro", classe: "tag-engenheiro" },
  DIRETOR: { nome: "Diretor", classe: "tag-diretor" },
  ADMIN: { nome: "Admin", classe: "tag-admin" },
};

// Barra superior: quem está logado, atalho para "Meu perfil" e o botão Sair.
export default function Topbar() {
  const { usuario, perfil, logout } = useAuth();
  const navigate = useNavigate();
  const etiqueta = PERFIS[perfil] ?? { nome: "Sem perfil", classe: "tag-padrao" };

  const sair = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-left" />

      <div className="topbar-right">
        <Link to="/meu-perfil" className="user-profile-box" title="Meu perfil">
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

        <button type="button" className="topbar-icon" title="Sair" aria-label="Sair" onClick={sair}>
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
