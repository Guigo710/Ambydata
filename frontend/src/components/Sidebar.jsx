import { NavLink, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/contexto";
import { telasDoMenu } from "../auth/permissoes";

const ROTULOS_DAS_TELAS = {
  "/painel": "nav.items.dashboard",
  "/status-maquina": "nav.items.machineStatus",
  "/manutencao": "nav.items.maintenance",
  "/oee": "nav.items.oee",
  "/produtividade": "nav.items.productivity",
  "/energia": "nav.items.energy",
  "/custos": "nav.items.costs",
  "/maquinas": "nav.items.machines",
  "/usuarios": "nav.items.users",
  "/meu-perfil": "nav.items.profile",
};

// Ícone de cada tela do menu (traço 2px, 16x16, cor do texto).
const ICONES = {
  "/painel": (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  ),
  "/status-maquina": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 3" />
    </>
  ),
  "/manutencao": (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />
    </>
  ),
  "/oee": (
    <>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 18l4-6" />
    </>
  ),
  "/produtividade": (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  "/energia": (
    <>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </>
  ),
  "/custos": (
    <>
      <path d="M12 2v20" />
      <path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  "/maquinas": (
    <>
      <rect x="2" y="7" width="20" height="13" rx="2" />
      <path d="M7 7V4h10v3" />
      <circle cx="8" cy="13.5" r="2" />
      <path d="M14 12h4M14 15h4" />
    </>
  ),
  "/usuarios": (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  "/meu-perfil": (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
};

function Icone({ rota }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[rota]}
    </svg>
  );
}

// Menu lateral: mostra só as telas que o perfil logado pode abrir (auth/permissoes.js).
export default function Sidebar() {
  const { t } = useTranslation();
  const { perfil } = useAuth();
  const [parametros] = useSearchParams();
  const maquina = parametros.get("maquina");

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <div className="sidebar-logo-text">
          <span className="brand">AmbyData</span>
          <span className="sub">Technology</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label={t("nav.menu")}>
        {telasDoMenu(perfil).map((tela) => (
          <NavLink
            key={tela.rota}
            to={tela.comMaquina && maquina ? { pathname: tela.rota, search: `?maquina=${encodeURIComponent(maquina)}` } : tela.rota}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <Icone rota={tela.rota} />
            {t(ROTULOS_DAS_TELAS[tela.rota] ?? tela.titulo)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
