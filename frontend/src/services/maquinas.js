// Consulta das máquinas (GET /api/maquinas) e textos derivados delas.
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "./api";

export const CHAVE_MAQUINAS = ["maquinas"];

export function useMaquinas({ somenteAtivas = false } = {}) {
  return useQuery({
    queryKey: [...CHAVE_MAQUINAS, { somenteAtivas }],
    queryFn: () => api.get(`/api/maquinas${somenteAtivas ? "?ativas=true" : ""}`).then((r) => r.data),
  });
}

export function formatarNumero(valor) {
  return Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function textoFaixa({ min, max }) {
  return `${formatarNumero(min)} a ${formatarNumero(max)} °C`;
}

// Faixa crítica = faixa permitida aumentada em `percentual`% da largura dela, para os dois lados.
export function faixaCritica({ min, max }, percentual) {
  const margem = ((max - min) * percentual) / 100;
  return { min: min - margem, max: max + margem };
}

// Agrupa por linha, na ordem em que a API devolve (linha e nome).
export function porLinha(maquinas) {
  const grupos = new Map();
  for (const maquina of maquinas) {
    if (!grupos.has(maquina.linha)) grupos.set(maquina.linha, []);
    grupos.get(maquina.linha).push(maquina);
  }
  return [...grupos.entries()];
}

export const TIPOS_DE_MAQUINA = {
  MISTURADORA: "Misturadora",
  FORNO: "Forno",
  RESFRIADOR: "Resfriador",
  ENVASADORA: "Envasadora",
  SELADORA: "Seladora",
  ROTULADORA: "Rotuladora",
  OUTRA: "Outra",
};

// Máquina escolhida nas telas de produção. Fica na URL (?maquina=<id>), então vale ao
// trocar de tela pelo menu e ao recarregar. Com `permitirTodas`, o padrão é nenhuma
// máquina ("Todas as máquinas"); sem ele, a primeira da lista.
export function useMaquinaSelecionada({ permitirTodas = false } = {}) {
  const [parametros, setParametros] = useSearchParams();
  const consulta = useMaquinas({ somenteAtivas: true });
  const maquinas = consulta.data ?? [];
  const pedida = parametros.get("maquina");
  const maquina = maquinas.find((m) => m.id === pedida) ?? (permitirTodas ? null : maquinas[0] ?? null);

  const escolher = useCallback((id) => {
    setParametros((atuais) => {
      const novos = new URLSearchParams(atuais);
      if (id) novos.set("maquina", id);
      else novos.delete("maquina");
      return novos;
    }, { replace: true });
  }, [setParametros]);

  // ?maquina= de máquina inexistente ou desativada: a tela mostra a padrão e a URL é corrigida,
  // para o menu não levar adiante um id que não vale.
  const pedidaInvalida = consulta.isSuccess && pedida !== null && !maquinas.some((m) => m.id === pedida);
  useEffect(() => {
    if (pedidaInvalida) escolher(null);
  }, [pedidaInvalida, escolher]);

  return { maquina, maquinas, carregando: consulta.isPending, erro: consulta.isError, escolher };
}
