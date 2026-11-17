// Consultas de /api/indicadores e a formatação usada nas telas de produção.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "./api";

// Telas "ao vivo" buscam de novo a cada 10 s (a frequência das leituras); o TanStack Query
// pausa enquanto a aba está escondida. Histórico e comparativos mudam a cada hora fechada.
export const INTERVALO_AO_VIVO = 10_000;
const INTERVALO_HISTORICO = 60_000;

const buscar = (url) => api.get(url).then((r) => r.data);

export function useResumo() {
  return useQuery({
    queryKey: ["indicadores", "resumo"],
    queryFn: () => buscar("/api/indicadores/resumo"),
    refetchInterval: INTERVALO_AO_VIVO,
  });
}

export function useAgora(maquinaId) {
  return useQuery({
    queryKey: ["indicadores", "agora", maquinaId],
    queryFn: () => buscar(`/api/indicadores/maquinas/${encodeURIComponent(maquinaId)}/agora`),
    enabled: Boolean(maquinaId),
    refetchInterval: INTERVALO_AO_VIVO,
  });
}

export function useLeituras(maquinaId, minutos = 120) {
  return useQuery({
    queryKey: ["indicadores", "leituras", maquinaId, minutos],
    queryFn: () => buscar(`/api/indicadores/leituras/${encodeURIComponent(maquinaId)}?minutos=${minutos}`),
    enabled: Boolean(maquinaId),
    refetchInterval: INTERVALO_AO_VIVO,
  });
}

export function useHistorico(maquinaId, horas = 24) {
  return useQuery({
    queryKey: ["indicadores", "historico", maquinaId, horas],
    queryFn: () => buscar(`/api/indicadores/maquinas/${encodeURIComponent(maquinaId)}/historico?horas=${horas}`),
    enabled: Boolean(maquinaId),
    refetchInterval: INTERVALO_HISTORICO,
  });
}

export function useComparativo(periodo, por) {
  return useQuery({
    queryKey: ["indicadores", "comparativo", periodo, por],
    queryFn: () => buscar(`/api/indicadores/comparativo?periodo=${periodo}&por=${por}`),
    refetchInterval: INTERVALO_HISTORICO,
  });
}

export function useFinanceiro(periodo) {
  return useQuery({
    queryKey: ["indicadores", "financeiro", periodo],
    queryFn: () => buscar(`/api/indicadores/financeiro?periodo=${periodo}`),
    refetchInterval: INTERVALO_HISTORICO,
  });
}

// Fórmulas exatamente como na SPEC-indicadores; as telas mostram as que usam.
export const FORMULAS = {
  disponibilidade: "Disponibilidade = tempo operando ÷ tempo planejado do turno",
  performance: "Performance = peças produzidas ÷ (cadência ideal × tempo operando)",
  qualidade: "Qualidade = peças boas ÷ peças produzidas",
  oee: "OEE = Disponibilidade × Performance × Qualidade",
  mtbf: "MTBF = tempo operando ÷ número de paradas",
  downtime: "Downtime = minutos parados no turno",
  lucro: "Lucro = peças boas × valor por peça − custo-hora × horas do turno",
  pecasPorHora: "Peças por hora = peças produzidas ÷ horas planejadas",
  limiteCritico: "Limite crítico = faixa permitida aumentada, para cada lado, no percentual crítico da largura dela",
};

export const NOME_DO_STATUS = { OPERANDO: "Operando", PARADA: "Parada", FORA_DO_TURNO: "Fora do turno" };
export const NOME_DA_ORIGEM = { SIMULADOR: "Simulador", DISPOSITIVO: "Dispositivo" };
export const NOME_DA_SITUACAO = { NORMAL: "Na faixa", ALERTA: "Fora da faixa", CRITICO: "Crítico" };

// Razão 0–1 em porcentagem com uma casa ("84,8%"); sem base de cálculo, um traço.
export function percentual(valor) {
  if (valor === null || valor === undefined) return "—";
  return `${(valor * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function tempoDesde(instante, agora = Date.now()) {
  if (!instante) return "sem leituras";
  const segundos = Math.round((agora - new Date(instante).getTime()) / 1000);
  if (segundos < 1) return "agora";
  if (segundos < 60) return `há ${segundos} s`;
  if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;
  return `há ${Math.floor(segundos / 3600)} h`;
}

export function formatarMinutos(minutos) {
  if (minutos === null || minutos === undefined) return "—";
  const total = Math.round(minutos);
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

// Hora atual que muda sozinha (para "há 8 s" andar entre uma busca e outra).
export function useRelogio(intervalo = 1000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervalo);
    return () => clearInterval(id);
  }, [intervalo]);
  return agora;
}
