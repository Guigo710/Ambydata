import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import {
  FORMULAS, INTERVALO_AO_VIVO, NOME_DA_ORIGEM, NOME_DO_STATUS, formatarMinutos, percentual, tempoDesde, useResumo,
} from "./indicadores";
import { criarQueryClient } from "./queryClient";

describe("formatação dos indicadores", () => {
  it("percentual com uma casa, vírgula e traço quando não há base", () => {
    expect(percentual(0.8482)).toBe("84,8%");
    expect(percentual(1)).toBe("100,0%");
    expect(percentual(0)).toBe("0,0%");
    expect(percentual(null)).toBe("—");
    expect(percentual(undefined)).toBe("—");
  });

  it("tempo desde a última leitura", () => {
    const agora = new Date("2026-11-17T12:00:00Z").getTime();
    expect(tempoDesde("2026-11-17T11:59:52Z", agora)).toBe("há 8 s");
    expect(tempoDesde("2026-11-17T11:57:00Z", agora)).toBe("há 3 min");
    expect(tempoDesde("2026-11-17T09:00:00Z", agora)).toBe("há 3 h");
    expect(tempoDesde("2026-11-17T12:00:03Z", agora)).toBe("agora");
    expect(tempoDesde(null, agora)).toBe("sem leituras");
  });

  it("minutos em h e min", () => {
    expect(formatarMinutos(25)).toBe("25 min");
    expect(formatarMinutos(90)).toBe("1 h 30 min");
    expect(formatarMinutos(120)).toBe("2 h");
    expect(formatarMinutos(null)).toBe("—");
  });

  it("nomes de status e origem para a tela", () => {
    expect(NOME_DO_STATUS).toEqual({ OPERANDO: "Operando", PARADA: "Parada", FORA_DO_TURNO: "Fora do turno" });
    expect(NOME_DA_ORIGEM).toEqual({ SIMULADOR: "Simulador", DISPOSITIVO: "Dispositivo" });
  });

  it("fórmulas iguais às da spec", () => {
    expect(FORMULAS.disponibilidade).toBe("Disponibilidade = tempo operando ÷ tempo planejado do turno");
    expect(FORMULAS.performance).toBe("Performance = peças produzidas ÷ (cadência ideal × tempo operando)");
    expect(FORMULAS.qualidade).toBe("Qualidade = peças boas ÷ peças produzidas");
    expect(FORMULAS.oee).toBe("OEE = Disponibilidade × Performance × Qualidade");
    expect(FORMULAS.mtbf).toBe("MTBF = tempo operando ÷ número de paradas");
    expect(FORMULAS.lucro).toBe("Lucro = peças boas × valor por peça − custo-hora × horas do turno");
  });
});

describe("atualização automática", () => {
  afterEach(() => vi.useRealTimers());

  it("o resumo é buscado de novo a cada 10 s", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: [] });
    const queryClient = criarQueryClient();
    renderHook(() => useResumo(), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });

    await vi.advanceTimersByTimeAsync(100);
    const chamadas = () => get.mock.calls.filter(([url]) => url === "/api/indicadores/resumo").length;
    expect(chamadas()).toBe(1);
    await vi.advanceTimersByTimeAsync(INTERVALO_AO_VIVO);
    expect(chamadas()).toBe(2);
    expect(INTERVALO_AO_VIVO).toBe(10_000);
  });
});
