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

const indicadores = (d, p, q, extra = {}) => ({
  disponibilidade: d, performance: p, qualidade: q, oee: d * p * q,
  mtbfMinutos: 55, downtimeMinutos: 5, pecasPorHora: 1500, ...extra,
});

// Última hora e turno de cada máquina, no formato de /api/indicadores (forno em temperatura
// crítica; envasadora parada, com dados de dispositivo).
const ULTIMA_HORA = {
  m1: {
    inicio: "2026-11-17T14:00:00Z", fim: "2026-11-17T15:00:00Z", emAndamento: true,
    totais: { segundosPlanejados: 3600, segundosOperando: 3300, segundosParado: 300, paradas: 1, pecasProduzidas: 1500, pecasBoas: 1470 },
    indicadores: indicadores(0.9167, 0.9091, 0.98),
  },
  m2: {
    inicio: "2026-11-17T14:00:00Z", fim: "2026-11-17T15:00:00Z", emAndamento: true,
    totais: { segundosPlanejados: 3600, segundosOperando: 2280, segundosParado: 1320, paradas: 4, pecasProduzidas: 2052, pecasBoas: 2001 },
    indicadores: indicadores(0.6333, 0.9, 0.9751, { mtbfMinutos: 9.5, downtimeMinutos: 22, pecasPorHora: 2052 }),
  },
};

const ULTIMA_LEITURA = {
  m1: { instante: "2026-11-17T14:59:50Z", status: "OPERANDO", temperatura: 225, origem: "SIMULADOR", situacaoTemperatura: "CRITICO" },
  m2: { instante: "2026-11-17T14:59:50Z", status: "PARADA", temperatura: 24.2, origem: "DISPOSITIVO", situacaoTemperatura: "NORMAL" },
};

export const RESUMO_DE_TESTE = MAQUINAS_DE_TESTE.map((maquina) => ({
  maquina, ultimaLeitura: ULTIMA_LEITURA[maquina.id], ultimaHora: ULTIMA_HORA[maquina.id],
}));

export function agoraDeTeste(id) {
  const maquina = MAQUINAS_DE_TESTE.find((m) => m.id === id);
  return {
    maquina, ultimaLeitura: ULTIMA_LEITURA[id], ultimaHora: ULTIMA_HORA[id], frequenciaSegundos: 10,
    turno: {
      inicio: "2026-11-17T09:00:00Z", fim: "2026-11-17T15:00:00Z", emAndamento: true,
      totais: { ...ULTIMA_HORA[id].totais, segundosPlanejados: 21600, paradas: 7 },
      indicadores: ULTIMA_HORA[id].indicadores,
    },
  };
}

// Pontos do gráfico de temperatura: o forno sobe de 195 a 225 °C; a envasadora fica em 24 °C.
export function leiturasDeTeste(id) {
  return Array.from({ length: 13 }, (_, i) => ({
    instante: new Date(Date.parse("2026-11-17T13:00:00Z") + i * 10 * 60 * 1000).toISOString(),
    status: id === "m2" && i > 10 ? "PARADA" : "OPERANDO",
    temperatura: id === "m1" ? 195 + i * 2.5 : 24,
    pecasProduzidas: 5,
    pecasBoas: 5,
  }));
}

// 24 horas fechadas: as 9 primeiras fora do turno (sem tempo planejado), 2 sem dados
// (backend dormindo, máquina com dispositivo) e o resto com OEE entre 70% e 92%.
export function historicoDeTeste(id) {
  const maquina = MAQUINAS_DE_TESTE.find((m) => m.id === id);
  const horas = Array.from({ length: 24 }, (_, i) => {
    const hora = new Date(Date.parse("2026-11-16T15:00:00Z") + i * 3600 * 1000).toISOString();
    if (i === 20 || i === 21) {
      return { hora, semDados: true, fonte: null, totais: null, indicadores: null };
    }
    if (i < 9) {
      return {
        hora, semDados: false, fonte: "GERADOR",
        totais: { segundosPlanejados: 0, segundosOperando: 0, segundosParado: 0, paradas: 0, pecasProduzidas: 0, pecasBoas: 0 },
        indicadores: { disponibilidade: null, performance: null, qualidade: null, oee: null, mtbfMinutos: null, downtimeMinutos: 0, pecasPorHora: null },
      };
    }
    const oee = i === 12 ? 0.7 : i === 15 ? 0.92 : 0.8;
    return {
      hora, semDados: false, fonte: "GERADOR",
      totais: { segundosPlanejados: 3600, segundosOperando: 3300, segundosParado: 300, paradas: 1, pecasProduzidas: 1500, pecasBoas: 1470 },
      indicadores: { disponibilidade: 0.9, performance: 0.9, qualidade: oee / 0.81, oee, mtbfMinutos: 55, downtimeMinutos: 5, pecasPorHora: 1500 },
    };
  });
  return {
    maquina, horas,
    total: {
      inicio: horas[0].hora, fim: "2026-11-17T15:00:00Z", emAndamento: false,
      totais: { segundosPlanejados: 46800, segundosOperando: 42900, segundosParado: 3900, paradas: 13, pecasProduzidas: 19500, pecasBoas: 19110 },
      indicadores: { disponibilidade: 0.9167, performance: 0.9, qualidade: 0.98, oee: 0.8085, mtbfMinutos: 55, downtimeMinutos: 65, pecasPorHora: 1500 },
    },
  };
}

beforeEach(() => {
  vi.spyOn(api, "get").mockImplementation(async (url) => {
    if (url === "/api/auth/me") {
      return { data: JSON.parse(localStorage.getItem(CHAVE_SESSAO))?.usuario };
    }
    if (url.startsWith("/api/maquinas")) {
      return { data: structuredClone(MAQUINAS_DE_TESTE) };
    }
    if (url === "/api/indicadores/resumo") {
      return { data: structuredClone(RESUMO_DE_TESTE) };
    }
    const leituras = url.match(/^\/api\/indicadores\/leituras\/([^/?]+)\?minutos=\d+$/);
    if (leituras) {
      return { data: leiturasDeTeste(leituras[1]) };
    }
    const historico = url.match(/^\/api\/indicadores\/maquinas\/([^/]+)\/historico\?horas=\d+$/);
    if (historico) {
      return { data: historicoDeTeste(historico[1]) };
    }
    const agora = url.match(/^\/api\/indicadores\/maquinas\/([^/]+)\/agora$/);
    if (agora) {
      return { data: structuredClone(agoraDeTeste(agora[1])) };
    }
    throw new Error(`GET ${url} sem resposta no teste`);
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
