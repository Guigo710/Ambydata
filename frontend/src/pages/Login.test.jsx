import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { renderizarApp } from "../test/utils";

function respostaDeLogin(perfil) {
  return {
    data: {
      token: "t1",
      expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
      usuario: { id: "1", nome: "Ana", email: "ana@x.com", perfil, ativo: true },
    },
  };
}

async function entrar(email = "ana@x.com", senha = "senha-123") {
  await userEvent.type(screen.getByLabelText(/e-mail/i), email);
  await userEvent.type(screen.getByLabelText(/senha/i), senha);
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("tela de login", () => {
  it("ADMIN entra e vai para Usuários", async () => {
    vi.spyOn(api, "post").mockResolvedValue(respostaDeLogin("ADMIN"));
    renderizarApp("/");

    await entrar();

    expect(await screen.findByRole("heading", { name: "Usuários" })).toBeTruthy();
  });

  it("OPERARIO entra e vai para o Painel", async () => {
    vi.spyOn(api, "post").mockResolvedValue(respostaDeLogin("OPERARIO"));
    renderizarApp("/");

    await entrar();

    expect(await screen.findByRole("heading", { name: "Painel Principal" })).toBeTruthy();
  });

  it("credenciais erradas mostram a mensagem do backend", async () => {
    vi.spyOn(api, "post").mockRejectedValue({ response: { status: 401, data: { status: 401, erro: "E-mail ou senha incorretos." } } });
    renderizarApp("/");

    await entrar();

    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeTruthy();
  });

  it("servidor fora do ar mostra aviso de conexão", async () => {
    vi.spyOn(api, "post").mockRejectedValue(new Error("Network Error"));
    renderizarApp("/");

    await entrar();

    expect(await screen.findByText("Não foi possível conectar ao servidor. Tente mais tarde.")).toBeTruthy();
  });

  it("botão fica desabilitado enquanto entra", async () => {
    let concluir;
    vi.spyOn(api, "post").mockReturnValue(new Promise((resolve) => { concluir = resolve; }));
    renderizarApp("/");

    await entrar();

    expect(screen.getByRole("button", { name: "Entrando..." }).disabled).toBe(true);
    concluir(respostaDeLogin("DIRETOR"));
    expect(await screen.findByRole("heading", { name: "Painel Principal" })).toBeTruthy();
  });

  it("'Esqueci minha senha' orienta a procurar o gestor", async () => {
    renderizarApp("/");

    await userEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));

    expect(screen.getByText("Procure seu gestor para redefinir sua senha.")).toBeTruthy();
  });
});
