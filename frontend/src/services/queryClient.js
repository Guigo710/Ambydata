// Configuração única do TanStack Query, usada pelo app e pelos testes.
import { QueryClient } from "@tanstack/react-query";

// Só repete quando a rede falhou (sem resposta), no máximo 2 vezes. Uma resposta do
// servidor (401, 403, 404, 500...) não muda com nova tentativa: mostra o erro na hora.
export function deveRepetir(falhas, erro) {
  return !erro?.response && falhas < 2;
}

export function criarQueryClient({ retryDelay } = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: deveRepetir, ...(retryDelay !== undefined && { retryDelay }) },
      mutations: { retry: false },
    },
  });
}
