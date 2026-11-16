import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexto";
import { podeAcessar, rotaInicial } from "./permissoes";

// Sem sessão: vai para o login. Com sessão mas sem permissão para a tela: vai para a
// tela inicial do perfil. As mesmas regras valem no backend.
export default function RotaProtegida({ children }) {
  const { autenticado, perfil } = useAuth();
  const { pathname } = useLocation();

  if (!autenticado) {
    return <Navigate to="/" replace />;
  }
  if (!podeAcessar(perfil, pathname)) {
    return <Navigate to={rotaInicial(perfil)} replace />;
  }
  return children;
}
