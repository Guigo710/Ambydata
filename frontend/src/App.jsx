import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/contexto";
import { rotaInicial } from "./auth/permissoes";
import RotaProtegida from "./auth/RotaProtegida";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Login from "./pages/Login";
import MeuPerfil from "./pages/MeuPerfil";
import PainelPrincipal from "./pages/PainelPrincipal";
import StatusMaquina from "./pages/StatusMaquina";
import Usuarios from "./pages/Usuarios";

// Moldura das telas internas: menu lateral, barra superior e a página da rota.
function LayoutDashboard() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

// Quem já está logado não vê o login de novo: vai direto para a sua tela inicial.
function TelaDeLogin() {
  const { autenticado, perfil } = useAuth();
  return autenticado ? <Navigate to={rotaInicial(perfil)} replace /> : <Login />;
}

// Separado do BrowserRouter para os testes montarem as rotas com MemoryRouter.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TelaDeLogin />} />
      <Route element={<RotaProtegida><LayoutDashboard /></RotaProtegida>}>
        <Route path="/painel" element={<PainelPrincipal />} />
        <Route path="/status-maquina" element={<StatusMaquina />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/meu-perfil" element={<MeuPerfil />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
