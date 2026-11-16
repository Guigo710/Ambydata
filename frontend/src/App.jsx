import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import PainelPrincipal from "./pages/PainelPrincipal";
import StatusMaquina from "./pages/StatusMaquina";
import Login from "./components/Login";

// 1. Componente de Layout para o Dashboard (Com os menus)
function LayoutDashboard() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="page-content">
          {/* O Outlet indica exatamente onde as páginas internas serão desenhadas */}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
// 2. Componente Principal de Rotas
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Raiz: Carrega a tela de Login totalmente limpa e isolada */}
        <Route path="/" element={<Login />} />

        {/* Rotas Protegidas: Todas aqui dentro herdam automaticamente a Sidebar e Topbar */}
        <Route element={<LayoutDashboard />}>
          <Route path="/painel" element={<PainelPrincipal />} />
          <Route path="/status-maquina" element={<StatusMaquina />} />
        </Route>

        {/* Rota de segurança: se o usuário digitar qualquer link inexistente, volta pro login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}