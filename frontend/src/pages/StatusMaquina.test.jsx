import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { api } from "../services/api";
import { renderizarApp, salvarSessao } from "../test/utils";

describe("Status da Máquina", () => {
  it("mostra status, temperatura crítica com aviso, peças e paradas da máquina", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/status-maquina");

    const atual = await screen.findByRole("region", { name: "Situação atual de Forno 02" });
    expect(within(atual).getByText("Operando")).toBeTruthy();
    expect(within(atual).getByText("225 °C")).toBeTruthy();
    expect(within(atual).getByText("Crítico")).toBeTruthy();
    expect(within(atual).getByText("1.500")).toBeTruthy();
    expect(within(atual).getByText("1.470 boas · 30 defeituosas")).toBeTruthy();
    expect(within(atual).getByText("7")).toBeTruthy(); // paradas no turno
    expect(within(atual).getByText("parado 5 min · MTBF 55 min")).toBeTruthy();

    expect(screen.getByRole("alert").textContent)
      .toBe("Temperatura além do limite crítico: 225 °C (crítico acima de 220 °C).");
  });

  it("máquina parada e na faixa não mostra aviso", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/status-maquina?maquina=m2");

    const atual = await screen.findByRole("region", { name: "Situação atual de Envasadora 04" });
    expect(within(atual).getByText("Parada")).toBeTruthy();
    expect(within(atual).getByText("Na faixa")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("gráfico das últimas 2 h descrito em texto, com a faixa e o limite crítico", async () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/status-maquina");

    const grafico = await screen.findByRole("img", { name: /Temperatura de Forno 02 nas últimas 2 h/ });
    const descricao = grafico.getAttribute("aria-label");
    expect(descricao).toContain("mínima 195 °C, máxima 225 °C");
    expect(descricao).toContain("faixa permitida 160 a 200 °C");
    expect(descricao).toContain("crítico abaixo de 140 °C ou acima de 220 °C");
    expect(api.get).toHaveBeenCalledWith("/api/indicadores/leituras/m1?minutos=120");
  });

  it("diz de onde vêm os dados e como paradas são contadas", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/status-maquina");

    const sobre = await screen.findByRole("region", { name: "Sobre estes dados" });
    expect(sobre.textContent).toContain("Forno 02");
    expect(sobre.textContent).toContain("Simulador");
    expect(within(sobre).getByText("MTBF = tempo operando ÷ número de paradas")).toBeTruthy();
    expect(within(sobre).getByText(/^Limite crítico = /)).toBeTruthy();
  });

  it("não sobra nenhum dado de exemplo do template", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/status-maquina");
    await screen.findByRole("region", { name: "Situação atual de Forno 02" });
    for (const exemplo of ["CoreID RAW", "Comparativo por Período", "vs mês anterior", "94.2%"]) {
      expect(screen.queryByText(exemplo)).toBeNull();
    }
  });
});
