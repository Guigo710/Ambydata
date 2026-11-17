import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { renderizarApp, salvarSessao } from "../test/utils";

const adapterOriginal = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = adapterOriginal; });

// Caminho completo, sem atalhos: o backend recusa o token (401) → interceptor do
// cliente da API → evento de sessão expirada → AuthProvider sai → tela de login.
describe("sessão recusada pelo backend durante o uso", () => {
  it("leva ao login com o aviso de sessão expirada", async () => {
    api.get.mockRestore();
    api.defaults.adapter = vi.fn(async (config) => {
      const erro = new Error("HTTP 401");
      erro.response = { status: 401, data: { status: 401, erro: "Faça login para continuar." }, headers: {}, config };
      erro.config = config;
      throw erro;
    });
    salvarSessao("ADMIN");

    renderizarApp("/usuarios");

    expect(await screen.findByRole("heading", { name: "Acesso ao Sistema" })).toBeTruthy();
    expect(screen.getByText("Sua sessão expirou. Faça login de novo.")).toBeTruthy();
  });
});
