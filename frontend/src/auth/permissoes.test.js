import { describe, expect, it } from "vitest";
import { PERFIS, podeAcessar, rotaInicial, telasDoMenu } from "./permissoes";

// Tabela "Telas por perfil" do SPEC-identity.md.
const ESPERADO = {
  "/painel": ["OPERARIO", "ENGENHEIRO", "DIRETOR"],
  "/status-maquina": ["OPERARIO", "ENGENHEIRO", "DIRETOR"],
  "/usuarios": ["ADMIN"],
  "/maquinas": ["ENGENHEIRO", "DIRETOR"],
  "/meu-perfil": ["OPERARIO", "ENGENHEIRO", "DIRETOR", "ADMIN"],
};

describe("matriz de permissões", () => {
  it("conhece os 4 perfis do backend", () => {
    expect(PERFIS).toEqual(["OPERARIO", "ENGENHEIRO", "DIRETOR", "ADMIN"]);
  });

  for (const [rota, perfis] of Object.entries(ESPERADO)) {
    for (const perfil of PERFIS) {
      const permitido = perfis.includes(perfil);
      it(`${perfil} ${permitido ? "acessa" : "não acessa"} ${rota}`, () => {
        expect(podeAcessar(perfil, rota)).toBe(permitido);
      });
    }
  }

  it("nega rota desconhecida e perfil ausente", () => {
    expect(podeAcessar("ADMIN", "/custos-lucros")).toBe(false);
    expect(podeAcessar(undefined, "/painel")).toBe(false);
  });

  it("menu do ADMIN tem só Usuários e Meu perfil", () => {
    expect(telasDoMenu("ADMIN").map((t) => t.rota)).toEqual(["/usuarios", "/meu-perfil"]);
  });

  it("menu do OPERARIO não tem Usuários", () => {
    expect(telasDoMenu("OPERARIO").map((t) => t.rota)).toEqual(["/painel", "/status-maquina", "/meu-perfil"]);
    expect(telasDoMenu("ENGENHEIRO").map((t) => t.rota)).toEqual(["/painel", "/status-maquina", "/maquinas", "/meu-perfil"]);
  });

  it("tela inicial: ADMIN vai para Usuários e os demais para o Painel", () => {
    expect(rotaInicial("ADMIN")).toBe("/usuarios");
    expect(rotaInicial("OPERARIO")).toBe("/painel");
    expect(rotaInicial("ENGENHEIRO")).toBe("/painel");
    expect(rotaInicial("DIRETOR")).toBe("/painel");
  });
});
