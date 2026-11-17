// Apoio aos testes: monta a aplicação com os provedores reais numa rota escolhida.
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { CHAVE_SESSAO } from "../auth/sessao";
import { AppRoutes } from "../App";
import { criarQueryClient } from "../services/queryClient";

export function salvarSessao(perfil, extras = {}) {
  const sessao = {
    token: "token-de-teste",
    expiraEm: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    usuario: { id: "1", nome: `Fulano ${perfil}`, email: "f@x.com", perfil, ativo: true },
    ...extras,
  };
  localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  return sessao;
}

export function renderizarApp(rota = "/") {
  // Mesma política de novas tentativas do app real, só que sem espera entre elas.
  const queryClient = criarQueryClient({ retryDelay: 0 });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[rota]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}
