import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./contexto";
import { CHAVE_SESSAO, EVENTO_SESSAO_EXPIRADA } from "./sessao";

function Sonda() {
  const { autenticado, usuario, perfil, aviso, login, logout } = useAuth();
  return (
    <div>
      <p>autenticado: {String(autenticado)}</p>
      <p>nome: {usuario?.nome ?? "-"}</p>
      <p>perfil: {perfil ?? "-"}</p>
      <p>aviso: {aviso ?? "-"}</p>
      <button onClick={() => login("ana@x.com", "senha-123")}>entrar</button>
      <button onClick={() => logout()}>sair</button>
    </div>
  );
}

function montar() {
  return render(
    <AuthProvider>
      <Sonda />
    </AuthProvider>,
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("AuthContext", () => {
  it("começa sem sessão", () => {
    montar();
    expect(screen.getByText("autenticado: false")).toBeTruthy();
  });

  it("login guarda a sessão e expõe usuário e perfil", async () => {
    vi.spyOn(api, "post").mockResolvedValue({
      data: {
        token: "t1",
        expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
        usuario: { id: "1", nome: "Ana", email: "ana@x.com", perfil: "ENGENHEIRO", ativo: true },
      },
    });
    montar();

    await userEvent.click(screen.getByText("entrar"));

    expect(api.post).toHaveBeenCalledWith("/api/auth/login", { email: "ana@x.com", senha: "senha-123" });
    expect(screen.getByText("perfil: ENGENHEIRO")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(CHAVE_SESSAO)).token).toBe("t1");
  });

  it("recupera a sessão salva ao recarregar a página", () => {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
      token: "t1",
      expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
      usuario: { id: "1", nome: "Ana", perfil: "DIRETOR" },
    }));
    montar();
    expect(screen.getByText("nome: Ana")).toBeTruthy();
  });

  it("descarta sessão salva já expirada", () => {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
      token: "t1",
      expiraEm: new Date(Date.now() - 1000).toISOString(),
      usuario: { id: "1", nome: "Ana", perfil: "DIRETOR" },
    }));
    montar();
    expect(screen.getByText("autenticado: false")).toBeTruthy();
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });

  it("descarta sessão salva corrompida", () => {
    localStorage.setItem(CHAVE_SESSAO, "{nao-e-json");
    montar();
    expect(screen.getByText("autenticado: false")).toBeTruthy();
  });

  it("logout apaga a sessão", async () => {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
      token: "t1", expiraEm: new Date(Date.now() + 3_600_000).toISOString(), usuario: { nome: "Ana", perfil: "ADMIN" },
    }));
    montar();

    await userEvent.click(screen.getByText("sair"));

    expect(screen.getByText("autenticado: false")).toBeTruthy();
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });

  it("sessão recusada pelo backend encerra com aviso", () => {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
      token: "t1", expiraEm: new Date(Date.now() + 3_600_000).toISOString(), usuario: { nome: "Ana", perfil: "ADMIN" },
    }));
    montar();

    act(() => window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA)));

    expect(screen.getByText("autenticado: false")).toBeTruthy();
    expect(screen.getByText("aviso: Sua sessão expirou. Faça login de novo.")).toBeTruthy();
  });
});
