import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import PainelPrincipal from "./pages/PainelPrincipal";
import StatusMaquina from "./pages/StatusMaquina";

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Sidebar />
        <div className="main">
          <Topbar />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Navigate to="/painel" replace />} />
              <Route path="/painel" element={<PainelPrincipal />} />
              <Route path="/status-maquina" element={<StatusMaquina />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}
