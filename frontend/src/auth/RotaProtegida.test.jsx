import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderizarApp, salvarSessao } from "../test/utils";

beforeEach(() => localStorage.clear());

describe("rotas protegidas", () => {
  it("sem sessão, qualquer tela leva ao login", () => {
    renderizarApp("/usuarios");
    expect(screen.getByRole("heading", { name: "Acesso ao Sistema" })).toBeTruthy();
  });

  it("OPERARIO que abre /usuarios vai para o Painel", () => {
    salvarSessao("OPERARIO");
    renderizarApp("/usuarios");
    expect(screen.getByRole("heading", { name: "Painel Principal" })).toBeTruthy();
  });

  it("ADMIN que abre /painel vai para Usuários", () => {
    salvarSessao("ADMIN");
    renderizarApp("/painel");
    expect(screen.getByRole("heading", { name: "Usuários" })).toBeTruthy();
  });

  it("usuário logado que abre o login vai para a sua tela inicial", () => {
    salvarSessao("DIRETOR");
    renderizarApp("/");
    expect(screen.getByRole("heading", { name: "Painel Principal" })).toBeTruthy();
  });

  it("rota inexistente volta para o início", () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/custos-lucros");
    expect(screen.getByRole("heading", { name: "Painel Principal" })).toBeTruthy();
  });

  it("todo perfil abre Meu perfil", () => {
    for (const perfil of ["OPERARIO", "ENGENHEIRO", "DIRETOR", "ADMIN"]) {
      localStorage.clear();
      salvarSessao(perfil);
      const { unmount } = renderizarApp("/meu-perfil");
      expect(screen.getByRole("heading", { name: "Meu perfil" })).toBeTruthy();
      unmount();
    }
  });
});
