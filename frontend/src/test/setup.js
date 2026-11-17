// Desmonta o que cada teste renderizou e limpa a sessão salva, para um teste não
// enxergar a tela ou o login do anterior. Por padrão, GET /api/auth/me devolve o
// usuário da sessão salva (o app revalida o usuário ao abrir); os testes podem
// trocar esse comportamento.
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { CHAVE_SESSAO } from "../auth/sessao";
import { api } from "../services/api";

// Duas máquinas de exemplo, uma por linha, no formato de GET /api/maquinas.
export const MAQUINAS_DE_TESTE = [
  {
    id: "m1", nome: "Forno 02", tipo: "FORNO", setor: "Cozimento", linha: "Linha A", cadenciaIdeal: 30,
    faixaTemperatura: { min: 160, max: 200 }, alertas: { percentualCritico: 50, minutosParadoMax: 15, taxaDefeitosMax: 8 },
    limiteCritico: { min: 140, max: 220 }, custoHora: 150, valorPorPeca: 2.2,
    turnoPlanejado: { inicio: "06:00", fim: "22:00" }, ativa: true,
  },
  {
    id: "m2", nome: "Envasadora 04", tipo: "ENVASADORA", setor: "Envase", linha: "Linha B", cadenciaIdeal: 60,
    faixaTemperatura: { min: 18, max: 30 }, alertas: { percentualCritico: 50, minutosParadoMax: 15, taxaDefeitosMax: 8 },
    limiteCritico: { min: 12, max: 36 }, custoHora: 120, valorPorPeca: 2.5,
    turnoPlanejado: { inicio: "06:00", fim: "22:00" }, ativa: true,
  },
];

beforeEach(() => {
  vi.spyOn(api, "get").mockImplementation(async (url) => {
    if (url === "/api/auth/me") {
      return { data: JSON.parse(localStorage.getItem(CHAVE_SESSAO))?.usuario };
    }
    if (url.startsWith("/api/maquinas")) {
      return { data: structuredClone(MAQUINAS_DE_TESTE) };
    }
    throw new Error(`GET ${url} sem resposta no teste`);
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
