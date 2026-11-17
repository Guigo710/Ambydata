import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { renderizarApp, salvarSessao } from "../test/utils";

describe("Painel principal", () => {
  it("em Todas as máquinas mostra um card por máquina, agrupado por linha", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/painel");

    const forno = await screen.findByRole("article", { name: "Forno 02" });
    expect(within(forno).getByText("Operando")).toBeTruthy();
    expect(within(forno).getByText("225 °C")).toBeTruthy();
    expect(within(forno).getByText("Crítico")).toBeTruthy();
    expect(within(forno).getByText("81,7%")).toBeTruthy(); // OEE da última hora
    expect(within(forno).getByText("Cozimento")).toBeTruthy();

    const envasadora = screen.getByRole("article", { name: "Envasadora 04" });
    expect(within(envasadora).getByText("Parada")).toBeTruthy();
    expect(within(envasadora).getByText("55,6%")).toBeTruthy();

    const linhaA = screen.getByRole("region", { name: "Linha A" });
    expect(within(linhaA).getByRole("article", { name: "Forno 02" })).toBeTruthy();
    expect(within(linhaA).queryByRole("article", { name: "Envasadora 04" })).toBeNull();
    expect(screen.getByRole("region", { name: "Linha B" })).toBeTruthy();
  });

  it("resume a fábrica: quantas operando, paradas e em situação crítica", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/painel");
    expect(await screen.findByText("1 operando · 1 parada · 1 com temperatura crítica")).toBeTruthy();
  });

  it("clicar num card mostra o resumo daquela máquina", async () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/painel");
    await userEvent.click(await screen.findByRole("button", { name: "Ver Forno 02" }));

    expect((await screen.findByRole("combobox", { name: "Máquina" })).value).toBe("m1");
    const resumo = await screen.findByRole("region", { name: "Resumo de Forno 02" });
    expect(within(resumo).getByText("Operando")).toBeTruthy();
    expect(within(resumo).getByText("225 °C")).toBeTruthy();
    expect(within(resumo).getByText("81,7%")).toBeTruthy();
    expect(within(resumo).getByText("1.500")).toBeTruthy(); // peças na última hora
    expect(screen.getByRole("link", { name: "Ver no Status da Máquina" }).getAttribute("href"))
      .toBe("/status-maquina?maquina=m1");
  });

  it("com uma máquina na URL busca o agora dela", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/painel?maquina=m2");

    const resumo = await screen.findByRole("region", { name: "Resumo de Envasadora 04" });
    expect(within(resumo).getByText("Parada")).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/api/indicadores/maquinas/m2/agora");
  });

  it("diz de onde vêm os dados", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/painel");
    const sobre = await screen.findByRole("region", { name: "Sobre estes dados" });
    expect(sobre.textContent).toContain("Todas as máquinas");
    expect(sobre.textContent).toContain("a cada 10 s");
  });

  it("não sobra nenhum dado de exemplo do template", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/painel");
    await screen.findByRole("article", { name: "Forno 02" });
    for (const exemplo of ["CoreID RAW", "Sketch", "Comparativo por Período", "vs mês anterior"]) {
      expect(screen.queryByText(exemplo)).toBeNull();
    }
  });

  it("se o resumo falhar, avisa", async () => {
    salvarSessao("OPERARIO");
    const original = api.get.getMockImplementation();
    vi.spyOn(api, "get").mockImplementation((url) =>
      url === "/api/indicadores/resumo" ? Promise.reject({ response: { status: 500, data: { erro: "Falhou." } } }) : original(url));
    renderizarApp("/painel");
    expect(await screen.findByText("Falhou.")).toBeTruthy();
  });
});
