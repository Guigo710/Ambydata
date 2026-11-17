import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { AuthContext } from "./contexto";
import { EVENTO_SESSAO_EXPIRADA, apagarSessao, gravarSessao, lerSessaoSalva } from "./sessao";

const SESSAO_EXPIROU = "Sua sessão expirou. Faça login de novo.";

// Lido uma vez ao abrir o app: a sessão salva e se ela já tinha vencido.
function estadoInicial() {
  const { sessao, expirada } = lerSessaoSalva();
  return { sessao, aviso: expirada ? SESSAO_EXPIROU : null };
}

// Guarda quem está logado. Único lugar do app que lê ou grava a sessão.
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [inicial] = useState(estadoInicial);
  const [sessao, setSessao] = useState(inicial.sessao);
  const [aviso, setAviso] = useState(inicial.aviso);

  // Sair também apaga os dados em cache (lista de usuários etc.) da sessão anterior.
  const logout = useCallback((mensagem = null) => {
    apagarSessao();
    queryClient.clear();
    setSessao(null);
    setAviso(mensagem);
  }, [queryClient]);

  const login = useCallback(async (email, senha) => {
    const { data } = await api.post("/api/auth/login", { email: email.trim(), senha });
    queryClient.clear();
    gravarSessao(data);
    setSessao(data);
    setAviso(null);
    return data.usuario;
  }, [queryClient]);

  // Nome, e-mail ou perfil mudaram (pelo próprio usuário ou pelo ADMIN).
  const atualizarUsuario = useCallback((usuario) => {
    setSessao((atual) => {
      if (!atual) {
        return atual;
      }
      const nova = { ...atual, usuario };
      gravarSessao(nova);
      return nova;
    });
  }, []);

  // O backend recusou o token durante o uso (evento disparado pelo cliente da API).
  useEffect(() => {
    const aoExpirar = () => logout(SESSAO_EXPIROU);
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, [logout]);

  // O token vence com o app aberto, mesmo em telas que não chamam a API.
  const expiraEm = sessao?.expiraEm;
  useEffect(() => {
    if (!expiraEm) {
      return undefined;
    }
    const restante = new Date(expiraEm).getTime() - Date.now();
    const temporizador = setTimeout(() => logout(SESSAO_EXPIROU), Math.max(restante, 0));
    return () => clearTimeout(temporizador);
  }, [expiraEm, logout]);

  // Ao abrir com uma sessão salva, confirma no backend quem é o usuário agora: o
  // perfil ou o nome podem ter mudado desde o login. Um 401 aqui encerra a sessão.
  const token = sessao?.token;
  useEffect(() => {
    if (!token) {
      return;
    }
    api.get("/api/auth/me")
      .then(({ data }) => data && atualizarUsuario(data))
      .catch(() => {});
  }, [token, atualizarUsuario]);

  const valor = useMemo(
    () => ({
      autenticado: Boolean(sessao),
      usuario: sessao?.usuario ?? null,
      perfil: sessao?.usuario?.perfil ?? null,
      aviso,
      login,
      logout,
      atualizarUsuario,
    }),
    [sessao, aviso, login, logout, atualizarUsuario],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
