import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderizarApp, salvarSessao } from "../test/utils";

describe("telas novas de indicadores", () => {
  it("OEE e Produtividade têm o seletor de máquina ao lado do título", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/oee?maquina=m2");
    expect(await screen.findByRole("heading", { level: 1, name: "OEE em tempo real" })).toBeTruthy();
    expect((await screen.findByRole("combobox", { name: "Máquina" })).value).toBe("m2");

    salvarSessao("OPERARIO");
    renderizarApp("/produtividade");
    expect(await screen.findByRole("heading", { level: 1, name: "Produtividade" })).toBeTruthy();
  });

  it("Custos e Lucros é só do DIRETOR", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/custos");
    expect(await screen.findByRole("heading", { level: 1, name: "Custos e Lucros" })).toBeTruthy();
  });

  it("OPERARIO que abre /custos volta para o Painel", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/custos");
    expect(await screen.findByRole("heading", { level: 1, name: "Painel Principal" })).toBeTruthy();
  });

  it("o menu leva a máquina escolhida para o OEE", async () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/status-maquina?maquina=m2");
    await screen.findByRole("combobox", { name: "Máquina" });
    expect(screen.getByRole("link", { name: "OEE" }).getAttribute("href")).toBe("/oee?maquina=m2");
  });
});
