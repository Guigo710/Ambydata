import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { api } from "../services/api";
import { renderizarApp, salvarSessao } from "../test/utils";

describe("Produtividade", () => {
  it("mostra peças por hora e boas × defeituosas da máquina escolhida", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/produtividade");

    const producao = await screen.findByRole("region", { name: "Produção de Forno 02" });
    expect(within(producao).getByText("1.500")).toBeTruthy();          // peças por hora
    expect(within(producao).getByText("1.470")).toBeTruthy();          // boas
    expect(within(producao).getByText("30")).toBeTruthy();             // defeituosas
    expect(within(producao).getByText("2,0% de defeitos")).toBeTruthy();
  });

  it("gráfico de 24 h de boas e defeituosas, descrito em texto", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/produtividade");

    const grafico = await screen.findByRole("img", { name: /Peças por hora de Forno 02 nas últimas 24 h/ });
    expect(grafico.getAttribute("aria-label")).toContain("19.500 produzidas, 19.110 boas e 390 defeituosas");
  });

  it("comparativo por linha em 24 h, trocando para setor, máquina e 7 dias", async () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/produtividade");

    const tabela = await screen.findByRole("table", { name: "Comparativo de produtividade" });
    const linhaA = within(tabela).getByRole("row", { name: /Linha A/ });
    expect(within(linhaA).getByText("24.000")).toBeTruthy();
    expect(within(linhaA).getByText("600")).toBeTruthy();       // defeituosas
    expect(within(linhaA).getByText("2,5%")).toBeTruthy();      // defeitos
    expect(within(linhaA).getByText("82,3%")).toBeTruthy();     // OEE
    expect(api.get).toHaveBeenCalledWith("/api/indicadores/comparativo?periodo=24h&por=linha");

    await userEvent.click(screen.getByRole("radio", { name: "Setor" }));
    expect(await within(await screen.findByRole("table", { name: "Comparativo de produtividade" }))
      .findByRole("row", { name: /Cozimento/ })).toBeTruthy();

    await userEvent.click(screen.getByRole("radio", { name: "7 dias" }));
    expect(api.get).toHaveBeenCalledWith("/api/indicadores/comparativo?periodo=7d&por=setor");
  });

  it("diz de onde vêm os dados", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/produtividade?maquina=m2");
    const sobre = await screen.findByRole("region", { name: "Sobre estes dados" });
    expect(sobre.textContent).toContain("Envasadora 04");
    expect(within(sobre).getByText("Peças por hora = peças produzidas ÷ horas planejadas")).toBeTruthy();
  });
});
