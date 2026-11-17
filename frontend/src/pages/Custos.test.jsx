import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { api } from "../services/api";
import { renderizarApp, salvarSessao } from "../test/utils";

describe("Custos e Lucros", () => {
  it("total da fábrica, por linha e por máquina com a conta do lucro", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/custos");

    const total = await screen.findByRole("region", { name: "Total da fábrica" });
    expect(within(total).getByText("R$ 4.320,00")).toBeTruthy();
    expect(within(total).getByText("R$ 123.339,30")).toBeTruthy();
    expect(within(total).getByText("R$ 119.019,30")).toBeTruthy();

    const porMaquina = screen.getByRole("table", { name: "Por máquina" });
    const forno = within(porMaquina).getByRole("row", { name: /Forno 02/ });
    expect(within(forno).getByText("R$ 51.926,80")).toBeTruthy();
    expect(within(forno).getByText("24.694 × R$ 2,20 − R$ 150,00 × 16 h")).toBeTruthy();

    const porLinha = screen.getByRole("table", { name: "Por linha" });
    expect(within(porLinha).getByRole("row", { name: /Linha B/ })).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/api/indicadores/financeiro?periodo=24h");
  });

  it("troca para 7 dias", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/custos");
    await screen.findByRole("region", { name: "Total da fábrica" });

    await userEvent.click(screen.getByRole("radio", { name: "7 dias" }));

    expect(await screen.findByText("R$ 833.135,10")).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/api/indicadores/financeiro?periodo=7d");
  });

  it("diz de onde vêm os dados e a fórmula do lucro", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/custos");
    const sobre = await screen.findByRole("region", { name: "Sobre estes dados" });
    expect(sobre.textContent).toContain("Todas as máquinas");
    expect(sobre.textContent).toContain("a cada hora fechada");
    expect(within(sobre).getByText("Lucro = peças boas × valor por peça − custo-hora × horas do turno")).toBeTruthy();
  });
});
