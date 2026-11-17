import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderizarApp, salvarSessao } from "../test/utils";

const MENU_ESPERADO = {
  OPERARIO: ["Painel principal", "Status da Máquina", "Meu perfil"],
  ENGENHEIRO: ["Painel principal", "Status da Máquina", "Meu perfil"],
  DIRETOR: ["Painel principal", "Status da Máquina", "Meu perfil"],
  ADMIN: ["Usuários", "Meu perfil"],
};

function itensDoMenu() {
  const menu = screen.getByRole("navigation", { name: "Menu principal" });
  return within(menu).getAllByRole("link").map((link) => link.textContent.trim());
}

describe("menu lateral", () => {
  for (const [perfil, itens] of Object.entries(MENU_ESPERADO)) {
    it(`${perfil} vê exatamente: ${itens.join(", ")}`, () => {
      salvarSessao(perfil);
      renderizarApp("/meu-perfil");
      expect(itensDoMenu()).toEqual(itens);
    });
  }

  it("não mostra telas que ainda não existem", () => {
    salvarSessao("DIRETOR");
    renderizarApp("/painel");
    const menu = screen.getByRole("navigation", { name: "Menu principal" });
    for (const ausente of ["Custos e Lucros", "Produtividade", "Parâmetros com IA", "Configurações", "OEE em Tempo Real"]) {
      expect(within(menu).queryByText(ausente)).toBeNull();
    }
  });

  it("marca a tela atual", () => {
    salvarSessao("OPERARIO");
    renderizarApp("/status-maquina");
    const atual = screen.getByRole("link", { name: "Status da Máquina" });
    expect(atual.getAttribute("aria-current")).toBe("page");
  });
});

describe("barra superior", () => {
  it("mostra o nome e o perfil do usuário logado", () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/painel");
    const topo = screen.getByRole("banner");
    expect(within(topo).getByText("Fulano ENGENHEIRO")).toBeTruthy();
    expect(within(topo).getByText("Engenheiro")).toBeTruthy();
  });

  it("Sair encerra a sessão e volta ao login", async () => {
    salvarSessao("ADMIN");
    renderizarApp("/usuarios");

    await userEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(screen.getByRole("heading", { name: "Acesso ao Sistema" })).toBeTruthy();
    expect(screen.queryByText("Sua sessão expirou. Faça login de novo.")).toBeNull();
  });
});
