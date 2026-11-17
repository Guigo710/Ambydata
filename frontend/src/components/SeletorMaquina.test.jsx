import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderizarApp, salvarSessao } from "../test/utils";

async function seletor() {
  return screen.findByRole("combobox", { name: "Máquina" });
}

describe("seletor de máquina ao lado do título", () => {
  it("no Painel lista 'Todas as máquinas' e as máquinas agrupadas por linha", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/painel");

    const lista = await seletor();
    expect(lista.value).toBe("");
    expect(within(lista).getByRole("option", { name: "Todas as máquinas" })).toBeTruthy();
    expect(within(lista).getByRole("group", { name: "Linha A" })).toBeTruthy();
    expect(within(lista).getByRole("group", { name: "Linha B" })).toBeTruthy();
    expect(await within(lista).findByRole("option", { name: "Envasadora 04" })).toBeTruthy();
  });

  it("a escolha acompanha a troca de tela pelo menu", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/painel");
    await userEvent.selectOptions(await seletor(), await screen.findByRole("option", { name: "Envasadora 04" }));

    await userEvent.click(screen.getByRole("link", { name: "Status da Máquina" }));

    expect((await seletor()).value).toBe("m2");
    expect(await screen.findByText("Envase · Linha B")).toBeTruthy();
  });

  it("abrir a URL com ?maquina= já mostra a máquina (sobrevive ao recarregar)", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/status-maquina?maquina=m2");

    expect((await seletor()).value).toBe("m2");
    expect(await screen.findByRole("region", { name: "Máquina Envasadora 04" })).toBeTruthy();
  });

  it("?maquina= de uma máquina que não existe (ou foi desativada) cai na primeira", async () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/status-maquina?maquina=nao-existe");

    expect((await seletor()).value).toBe("m1");
    expect(await screen.findByText("Cozimento · Linha A")).toBeTruthy();
  });

  it("Status da Máquina sem escolha mostra a primeira máquina e a faixa permitida", async () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/status-maquina");

    expect(await screen.findByText("Cozimento · Linha A")).toBeTruthy();
    expect(screen.getByText("160 a 200 °C")).toBeTruthy();
    expect(screen.getByText("abaixo de 140 °C ou acima de 220 °C (50% da faixa)")).toBeTruthy();
  });
});
