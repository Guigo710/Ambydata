// Desmonta o que cada teste renderizou e limpa a sessão salva, para um teste não
// enxergar a tela ou o login do anterior. Por padrão, GET /api/auth/me devolve o
// usuário da sessão salva (o app revalida o usuário ao abrir); os testes podem
// trocar esse comportamento.
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { CHAVE_SESSAO } from "../auth/sessao";
import { api } from "../services/api";

beforeEach(() => {
  vi.spyOn(api, "get").mockImplementation(async (url) => {
    if (url === "/api/auth/me") {
      return { data: JSON.parse(localStorage.getItem(CHAVE_SESSAO))?.usuario };
    }
    throw new Error(`GET ${url} sem resposta no teste`);
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
