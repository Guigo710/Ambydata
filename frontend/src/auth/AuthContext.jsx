import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { AuthContext } from "./contexto";
import { EVENTO_SESSAO_EXPIRADA, apagarSessao, gravarSessao, lerSessao } from "./sessao";

// Guarda quem está logado. Único lugar do app que lê ou grava a sessão.
export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(lerSessao);
  const [aviso, setAviso] = useState(null);

  const logout = useCallback((mensagem = null) => {
    apagarSessao();
    setSessao(null);
    setAviso(mensagem);
  }, []);

  useEffect(() => {
    const aoExpirar = () => logout("Sua sessão expirou. Faça login de novo.");
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, [logout]);

  const login = useCallback(async (email, senha) => {
    const { data } = await api.post("/api/auth/login", { email: email.trim(), senha });
    gravarSessao(data);
    setSessao(data);
    setAviso(null);
    return data.usuario;
  }, []);

  const valor = useMemo(
    () => ({
      autenticado: Boolean(sessao),
      usuario: sessao?.usuario ?? null,
      perfil: sessao?.usuario?.perfil ?? null,
      aviso,
      login,
      logout,
    }),
    [sessao, aviso, login, logout],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
