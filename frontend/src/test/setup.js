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
    energia: { potenciaKw: 45, potenciaRegeneradaKw: 0, percentualRegeneracao: 0 },
  },
  {
    id: "m2", nome: "Envasadora 04", tipo: "ENVASADORA", setor: "Envase", linha: "Linha B", cadenciaIdeal: 60,
    faixaTemperatura: { min: 18, max: 30 }, alertas: { percentualCritico: 50, minutosParadoMax: 15, taxaDefeitosMax: 8 },
    limiteCritico: { min: 12, max: 36 }, custoHora: 120, valorPorPeca: 2.5,
    turnoPlanejado: { inicio: "06:00", fim: "22:00" }, ativa: true,
    energia: { potenciaKw: 11, potenciaRegeneradaKw: 3, percentualRegeneracao: 15 },
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
      totais: {
        ...ULTIMA_HORA[id].totais, segundosPlanejados: 21600, paradas: 7,
        pecasProduzidas: ULTIMA_HORA[id].totais.pecasProduzidas * 6, pecasBoas: ULTIMA_HORA[id].totais.pecasBoas * 6,
      },
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

// Comparativo: Forno (Linha A, Cozimento) e Envasadora (Linha B, Envase), cada um sozinho no grupo.
const GRUPOS = {
  linha: ["Linha A", "Linha B"], setor: ["Cozimento", "Envase"], maquina: ["Forno 02", "Envasadora 04"],
};
export function comparativoDeTeste(periodo, por) {
  const fator = periodo === "7d" ? 7 : 1;
  return {
    periodo, por, inicio: "2026-11-16T15:00:00Z", fim: "2026-11-17T15:00:00Z",
    grupos: GRUPOS[por].map((grupo, i) => ({
      grupo, maquinas: [MAQUINAS_DE_TESTE[i].nome],
      totais: {
        segundosPlanejados: 57600 * fator, segundosOperando: 54000 * fator, segundosParado: 3600 * fator, paradas: 9 * fator,
        pecasProduzidas: (i === 0 ? 24000 : 36000) * fator, pecasBoas: (i === 0 ? 23400 : 34200) * fator,
      },
      indicadores: {
        disponibilidade: 0.9375, performance: 0.9, qualidade: i === 0 ? 0.975 : 0.95, oee: i === 0 ? 0.8227 : 0.8016,
        mtbfMinutos: 100, downtimeMinutos: 60 * fator, pecasPorHora: i === 0 ? 1500 : 2250,
      },
    })),
  };
}

export function financeiroDeTeste(periodo) {
  const fator = periodo === "7d" ? 7 : 1;
  const maquinas = [
    { id: "m1", nome: "Forno 02", setor: "Cozimento", linha: "Linha A", custoHora: 150, valorPorPeca: 2.2,
      horasPlanejadas: 16 * fator, pecasBoas: 24694 * fator,
      financeiro: { custo: 2400 * fator, receita: 54326.8 * fator, lucro: 51926.8 * fator } },
    { id: "m2", nome: "Envasadora 04", setor: "Envase", linha: "Linha B", custoHora: 120, valorPorPeca: 2.5,
      horasPlanejadas: 16 * fator, pecasBoas: 27605 * fator,
      financeiro: { custo: 1920 * fator, receita: 69012.5 * fator, lucro: 67092.5 * fator } },
  ];
  return {
    periodo, inicio: "2026-11-16T15:00:00Z", fim: "2026-11-17T15:00:00Z", maquinas,
    linhas: maquinas.map((m) => ({ linha: m.linha, financeiro: m.financeiro })),
    total: { custo: 4320 * fator, receita: 123339.3 * fator, lucro: 119019.3 * fator },
  };
}

// Energia de 24 h: forno 45 kW × 15 h (sem regeneração); envasadora 11 kW × 12 h, regenerando
// 3 kW em 15% do tempo (1,8 h). Tarifas R$ 0,85 / R$ 0,55; demanda 150 kW × R$ 40 → R$ 200 no dia.
export const TARIFAS_DE_TESTE = {
  id: "fabrica", tarifaCheia: 0.85, tarifaCompensavel: 0.55, demandaContratadaKw: 150, tarifaDemanda: 40,
  atualizadoEm: "2026-11-17T12:00:00Z", atualizadoPor: "Fulano ENGENHEIRO",
};
export function energiaDeTeste(periodo) {
  const balanco = (potenciaKw, horasOperando, potenciaRegeneradaKw, horasRegeneracao) => {
    const consumoKwh = potenciaKw * horasOperando;
    const energiaInjetadaKwh = potenciaRegeneradaKw * horasRegeneracao;
    const custoEntrada = consumoKwh * 0.85;
    const valorInjetado = energiaInjetadaKwh * 0.55;
    return { potenciaKw, horasOperando, consumoKwh, custoEntrada, potenciaRegeneradaKw, horasRegeneracao,
      energiaInjetadaKwh, valorInjetado, custoLiquido: custoEntrada - valorInjetado };
  };
  const forno = balanco(45, 15, 0, 0);
  const envasadora = balanco(11, 12, 3, 1.8);
  const soma = (bs) => ["consumoKwh", "custoEntrada", "energiaInjetadaKwh", "valorInjetado", "custoLiquido"]
    .reduce((acc, k) => ({ ...acc, [k]: bs.reduce((t, b) => t + b[k], 0) }), {});
  const horas = periodo === "7d" ? 168 : 24;
  const encargos = (150 * 40 * horas) / 720;
  return {
    periodo, inicio: "2026-11-16T15:00:00Z", fim: "2026-11-17T15:00:00Z", tarifas: TARIFAS_DE_TESTE,
    maquinas: [
      { id: "m1", nome: "Forno 02", setor: "Cozimento", linha: "Linha A", semParametros: false, energia: MAQUINAS_DE_TESTE[0].energia, balanco: forno },
      { id: "m2", nome: "Envasadora 04", setor: "Envase", linha: "Linha B", semParametros: false, energia: MAQUINAS_DE_TESTE[1].energia, balanco: envasadora },
    ],
    linhas: [{ linha: "Linha A", soma: soma([forno]) }, { linha: "Linha B", soma: soma([envasadora]) }],
    total: { maquinas: soma([forno, envasadora]), horasPeriodo: horas, encargosDemanda: encargos,
      custoLiquido: soma([forno, envasadora]).custoLiquido + encargos },
  };
}

// Chamados do kanban: dois abertos no forno (um automático crítico, um de pessoa com prioridade
// alta), um em andamento e um finalizado na envasadora.
const evento = (em, tipo, texto, por) => ({ em, tipo, texto, por });
export const CHAMADOS_DE_TESTE = [
  {
    id: "c1", tipo: "MECANICO", maquinaId: "m1", maquinaNome: "Forno 02", setor: "Cozimento", linha: "Linha A",
    descricao: "Barulho estranho no motor.", prioridade: "ALTA", status: "ABERTO",
    abertoPor: { nome: "Fulano OPERARIO", sistema: false }, abertoEm: "2026-11-17T13:20:00Z",
    historico: [evento("2026-11-17T13:20:00Z", "ABERTO", "Chamado aberto.", "Fulano OPERARIO")],
  },
  {
    id: "c2", tipo: "TEMPERATURA", maquinaId: "m1", maquinaNome: "Forno 02", setor: "Cozimento", linha: "Linha A",
    descricao: "Temperatura de 230,5 °C, acima do limite crítico de 220 °C (faixa 160 a 200 °C).", prioridade: "CRITICA",
    status: "ABERTO", causaAutomatica: "TEMPERATURA_CRITICA",
    abertoPor: { nome: "Sistema — limite ultrapassado", sistema: true }, abertoEm: "2026-11-17T14:05:00Z",
    historico: [evento("2026-11-17T14:05:00Z", "ABERTO", "Aberto automaticamente.", "Sistema")],
  },
  {
    id: "c3", tipo: "PARADA", maquinaId: "m2", maquinaNome: "Envasadora 04", setor: "Envase", linha: "Linha B",
    descricao: "Esteira travando na saída.", prioridade: "MEDIA", status: "EM_ANDAMENTO",
    abertoPor: { nome: "Fulano OPERARIO", sistema: false }, abertoEm: "2026-11-17T10:00:00Z",
    responsavel: { nome: "Eng Beltrano", sistema: false }, assumidoEm: "2026-11-17T10:30:00Z",
    historico: [
      evento("2026-11-17T10:00:00Z", "ABERTO", "Chamado aberto.", "Fulano OPERARIO"),
      evento("2026-11-17T10:30:00Z", "ASSUMIDO", "Assumido.", "Eng Beltrano"),
    ],
  },
  {
    id: "c4", tipo: "ELETRICO", maquinaId: "m2", maquinaNome: "Envasadora 04", setor: "Envase", linha: "Linha B",
    descricao: "Sensor de nível sem leitura.", prioridade: "BAIXA", status: "FINALIZADO",
    abertoPor: { nome: "Fulano OPERARIO", sistema: false }, abertoEm: "2026-11-16T08:00:00Z",
    responsavel: { nome: "Eng Beltrano", sistema: false }, assumidoEm: "2026-11-16T08:10:00Z",
    finalizadoEm: "2026-11-16T09:00:00Z", solucao: "Sensor trocado.",
    historico: [],
  },
];

// Sino: duas não lidas (uma leva ao chamado c4) e uma lida.
export const NOTIFICACOES_DE_TESTE = {
  naoLidas: 2,
  itens: [
    { id: "n1", texto: "Seu chamado do Envasadora 04 foi finalizado por Eng Beltrano.", link: "/manutencao?chamado=c4", lida: false, criadaEm: "2026-11-17T14:50:00Z" },
    { id: "n2", texto: "Chamado automático: Forno 02 — temperatura crítica (230,5 °C).", link: "/manutencao?chamado=c2", lida: false, criadaEm: "2026-11-17T14:05:00Z" },
    { id: "n3", texto: "Aviso antigo.", link: "/manutencao", lida: true, criadaEm: "2026-11-16T09:00:00Z" },
  ],
};

beforeEach(() => {
  vi.spyOn(api, "get").mockImplementation(async (url) => {
    if (url === "/api/auth/me") {
      return { data: JSON.parse(localStorage.getItem(CHAVE_SESSAO))?.usuario };
    }
    if (url.startsWith("/api/maquinas")) {
      return { data: structuredClone(MAQUINAS_DE_TESTE) };
    }
    if (url === "/api/notificacoes") {
      return { data: structuredClone(NOTIFICACOES_DE_TESTE) };
    }
    const chamado = url.match(/^\/api\/chamados\/([^/?]+)$/);
    if (chamado) {
      const encontrado = CHAMADOS_DE_TESTE.find((c) => c.id === chamado[1]);
      if (!encontrado) throw { response: { status: 404, data: { status: 404, erro: "Chamado não encontrado." } } };
      return { data: structuredClone(encontrado) };
    }
    const chamados = url.match(/^\/api\/chamados(?:\?maquinaId=([^&]+))?$/);
    if (chamados) {
      const lista = CHAMADOS_DE_TESTE.filter((c) => !chamados[1] || c.maquinaId === chamados[1]);
      return { data: structuredClone(lista) };
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
    const comparativo = url.match(/^\/api\/indicadores\/comparativo\?periodo=(24h|7d)&por=(setor|linha|maquina)$/);
    if (comparativo) {
      return { data: comparativoDeTeste(comparativo[1], comparativo[2]) };
    }
    const financeiro = url.match(/^\/api\/indicadores\/financeiro\?periodo=(24h|7d)$/);
    if (financeiro) {
      return { data: financeiroDeTeste(financeiro[1]) };
    }
    const energia = url.match(/^\/api\/indicadores\/energia\?periodo=(24h|7d)$/);
    if (energia) {
      return { data: energiaDeTeste(energia[1]) };
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
