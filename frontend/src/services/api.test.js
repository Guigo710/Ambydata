import { afterEach, describe, expect, it, vi } from "vitest";
import { api, configurarSessao, mensagemDeErro } from "./api";

// Substitui o transporte HTTP do axios: responde com o status pedido e devolve a config.
function responderCom(status, data = {}) {
  api.defaults.adapter = vi.fn(async (config) => {
    const resposta = { status, data, headers: {}, config, statusText: "" };
    if (status >= 400) {
      const erro = new Error(`HTTP ${status}`);
      erro.response = resposta;
      erro.config = config;
      erro.isAxiosError = true;
      throw erro;
    }
    return resposta;
  });
  return api.defaults.adapter;
}

afterEach(() => configurarSessao({ obterToken: () => null, aoExpirar: () => {} }));

describe("cliente da API", () => {
  it("anexa o token da sessão em toda requisição", async () => {
    configurarSessao({ obterToken: () => "abc.def.ghi", aoExpirar: () => {} });
    const transporte = responderCom(200);

    await api.get("/api/auth/me");

    expect(transporte.mock.calls[0][0].headers.Authorization).toBe("Bearer abc.def.ghi");
  });

  it("não envia Authorization sem sessão", async () => {
    const transporte = responderCom(200);

    await api.get("/api/auth/me");

    expect(transporte.mock.calls[0][0].headers.Authorization).toBeUndefined();
  });

  it("um 401 durante o uso encerra a sessão", async () => {
    const aoExpirar = vi.fn();
    configurarSessao({ obterToken: () => "token", aoExpirar });
    responderCom(401);

    await expect(api.get("/api/usuarios")).rejects.toThrow();
    expect(aoExpirar).toHaveBeenCalledOnce();
  });

  it("um 401 no próprio login não é sessão expirada", async () => {
    const aoExpirar = vi.fn();
    configurarSessao({ obterToken: () => null, aoExpirar });
    responderCom(401);

    await expect(api.post("/api/auth/login", {})).rejects.toThrow();
    expect(aoExpirar).not.toHaveBeenCalled();
  });

  it("usa VITE_API_URL como endereço base", () => {
    expect(api.defaults.baseURL).toBe(import.meta.env.VITE_API_URL || "http://localhost:8080");
  });
});

describe("mensagemDeErro", () => {
  it("usa a mensagem do formato padrão do backend", () => {
    expect(mensagemDeErro({ response: { data: { status: 409, erro: "Precisa de um ADMIN." } } }))
      .toBe("Precisa de um ADMIN.");
  });

  it("explica quando o servidor não responde", () => {
    expect(mensagemDeErro(new Error("Network Error"))).toBe("Não foi possível conectar ao servidor. Tente mais tarde.");
  });
});
