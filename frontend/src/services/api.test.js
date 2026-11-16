import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, configurarSessao, mensagemDeErro, resolverEnderecoDaApi } from "./api";

const adapterOriginal = api.defaults.adapter;

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

beforeEach(() => api.get.mockRestore?.()); // aqui o GET real passa pelos interceptors
afterEach(() => {
  api.defaults.adapter = adapterOriginal;
  configurarSessao({ obterToken: () => null, aoExpirar: () => {} });
});

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

  it("um 401 atrasado de uma sessão antiga não derruba a sessão nova", async () => {
    let tokenAtual = "token-antigo";
    const aoExpirar = vi.fn();
    configurarSessao({ obterToken: () => tokenAtual, aoExpirar });
    api.defaults.adapter = vi.fn(async (config) => {
      tokenAtual = "token-novo"; // novo login enquanto a requisição antiga voltava
      const erro = new Error("HTTP 401");
      erro.response = { status: 401, data: {}, headers: {}, config };
      erro.config = config;
      throw erro;
    });

    await expect(api.get("/api/usuarios")).rejects.toThrow();
    expect(aoExpirar).not.toHaveBeenCalled();
  });
});

describe("endereço da API", () => {
  it("usa VITE_API_URL quando definida", () => {
    expect(resolverEnderecoDaApi({ VITE_API_URL: "https://api.exemplo.com", DEV: false })).toBe("https://api.exemplo.com");
  });

  it("em desenvolvimento, sem VITE_API_URL, usa o backend local", () => {
    expect(resolverEnderecoDaApi({ DEV: true })).toBe("http://localhost:8080");
  });

  it("em produção, sem VITE_API_URL, nunca manda credenciais para localhost", () => {
    expect(resolverEnderecoDaApi({ DEV: false })).toBeUndefined();
  });

  it("o cliente usa de fato a VITE_API_URL do build", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.exemplo.test");
    vi.resetModules();
    const { api: recarregado } = await import("./api");
    expect(recarregado.defaults.baseURL).toBe("https://api.exemplo.test");
    vi.unstubAllEnvs();
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
