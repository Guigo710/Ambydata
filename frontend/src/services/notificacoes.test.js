import { describe, expect, it } from "vitest";
import { linkSeguro } from "./notificacoes";

describe("link das notificações", () => {
  it("só segue o Report de Manutenção, com ou sem chamado", () => {
    expect(linkSeguro("/manutencao?chamado=6afca3feebfb40ffb45c2791")).toBe("/manutencao?chamado=6afca3feebfb40ffb45c2791");
    expect(linkSeguro("/manutencao")).toBe("/manutencao");
  });

  it("qualquer outra coisa vira o Report de Manutenção", () => {
    for (const ruim of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/manutencao?chamado=x&next=//evil.com", null]) {
      expect(linkSeguro(ruim)).toBe("/manutencao");
    }
  });
});
