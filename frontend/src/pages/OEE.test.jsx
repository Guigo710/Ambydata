import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { api } from "../services/api";
import { renderizarApp, salvarSessao } from "../test/utils";

async function decomposicao() {
  return screen.findByRole("region", { name: "Decomposição do OEE" });
}

describe("OEE em tempo real", () => {
  it("decompõe o OEE da última hora em D × P × Q, mostrando a conta com os números", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/oee");

    const d = await decomposicao();
    expect(within(d).getByText("81,7%")).toBeTruthy();
    expect(within(d).getByText("55 min operando ÷ 1 h planejada")).toBeTruthy();
    expect(within(d).getByText("1.500 peças ÷ (30 peças/min × 55 min = 1.650 peças)")).toBeTruthy();
    expect(within(d).getByText("1.470 boas ÷ 1.500 peças")).toBeTruthy();
    expect(within(d).getByText("91,7% × 90,9% × 98,0%")).toBeTruthy();
  });

  it("troca para o turno", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/oee");
    await decomposicao();

    await userEvent.click(screen.getByRole("radio", { name: "Turno" }));

    const d = await decomposicao();
    expect(within(d).getByText("55 min operando ÷ 6 h planejadas")).toBeTruthy();
  });

  it("OPERARIO não vê MTBF nem tempo parado", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/oee");
    await decomposicao();
    expect(screen.queryByRole("region", { name: "Confiabilidade" })).toBeNull();
  });

  it("ENGENHEIRO e DIRETOR veem MTBF e tempo parado com a conta", async () => {
    for (const perfil of ["ENGENHEIRO", "DIRETOR"]) {
      salvarSessao(perfil);
      const { unmount } = renderizarApp("/oee");
      const c = await screen.findByRole("region", { name: "Confiabilidade" });
      expect(within(c).getByText("55 min operando ÷ 1 parada")).toBeTruthy();
      expect(within(c).getByText("5 min")).toBeTruthy();
      unmount();
    }
  });

  it("gráfico das últimas 24 h descrito em texto, contando as horas sem dados", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/oee?maquina=m1");

    const grafico = await screen.findByRole("img", { name: /OEE por hora de Forno 02 nas últimas 24 h/ });
    const descricao = grafico.getAttribute("aria-label");
    expect(descricao).toContain("OEE do período 80,9%");
    expect(descricao).toContain("menor 70,0%");
    expect(descricao).toContain("maior 92,0%");
    expect(descricao).toContain("2 horas sem dados");
    expect(api.get).toHaveBeenCalledWith("/api/indicadores/maquinas/m1/historico?horas=24");
  });

  it("diz de onde vêm os dados e as fórmulas", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/oee?maquina=m2");
    const sobre = await screen.findByRole("region", { name: "Sobre estes dados" });
    expect(sobre.textContent).toContain("Envasadora 04");
    expect(sobre.textContent).toContain("Dispositivo");
    expect(within(sobre).getByText("OEE = Disponibilidade × Performance × Qualidade")).toBeTruthy();
  });
});
