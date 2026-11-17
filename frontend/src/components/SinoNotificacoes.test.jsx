import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { INTERVALO_NOTIFICACOES, useNotificacoes } from "../services/notificacoes";
import { criarQueryClient } from "../services/queryClient";
import { renderizarApp, salvarSessao } from "../test/utils";

async function sino() {
  return screen.findByRole("button", { name: /^Notificações/ });
}

describe("sino de notificações", () => {
  afterEach(() => vi.useRealTimers());

  it("mostra quantas não lidas", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/painel");

    const botao = await screen.findByRole("button", { name: "Notificações, 2 não lidas" });
    expect(within(botao).getByText("2")).toBeTruthy();
    expect(botao.getAttribute("aria-expanded")).toBe("false");
  });

  it("ADMIN não tem sino", async () => {
    salvarSessao("ADMIN");
    renderizarApp("/usuarios");
    await screen.findByRole("heading", { level: 1, name: "Usuários" });
    expect(screen.queryByRole("button", { name: /^Notificações/ })).toBeNull();
    expect(api.get).not.toHaveBeenCalledWith("/api/notificacoes");
  });

  it("abre a lista, marca todas como lidas e fecha com Esc", async () => {
    salvarSessao("ENGENHEIRO");
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: null });
    renderizarApp("/painel");

    await userEvent.click(await sino());
    const lista = screen.getByRole("region", { name: "Notificações" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(3);
    expect(within(lista).getByText("Chamado automático: Forno 02 — temperatura crítica (230,5 °C).")).toBeTruthy();

    await userEvent.click(within(lista).getByRole("button", { name: "Marcar todas como lidas" }));
    expect(post).toHaveBeenCalledWith("/api/notificacoes/lidas");

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Notificações" })).toBeNull();
    expect((await sino()).getAttribute("aria-expanded")).toBe("false");
  });

  it("clicar no aviso marca como lido e abre o chamado", async () => {
    salvarSessao("OPERARIO");
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: null });
    renderizarApp("/painel");

    await userEvent.click(await sino());
    await userEvent.click(screen.getByRole("link", { name: /Seu chamado do Envasadora 04 foi finalizado/ }));

    expect(post).toHaveBeenCalledWith("/api/notificacoes/n1/lida");
    expect(await screen.findByRole("dialog", { name: "Elétrico — Envasadora 04" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Notificações" })).toBeNull();
  });

  it("sem notificações", async () => {
    salvarSessao("DIRETOR");
    const original = api.get.getMockImplementation();
    vi.spyOn(api, "get").mockImplementation((url) =>
      url === "/api/notificacoes" ? Promise.resolve({ data: { naoLidas: 0, itens: [] } }) : original(url));
    renderizarApp("/painel");

    await userEvent.click(await screen.findByRole("button", { name: "Notificações" }));
    expect(screen.getByText("Nenhuma notificação.")).toBeTruthy();
  });

  it("busca de novo a cada 15 s", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { naoLidas: 0, itens: [] } });
    const queryClient = criarQueryClient();
    renderHook(() => useNotificacoes(true), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });

    await vi.advanceTimersByTimeAsync(100);
    const chamadas = () => get.mock.calls.filter(([url]) => url === "/api/notificacoes").length;
    expect(chamadas()).toBe(1);
    await vi.advanceTimersByTimeAsync(INTERVALO_NOTIFICACOES);
    expect(chamadas()).toBe(2);
    expect(INTERVALO_NOTIFICACOES).toBe(15_000);
  });
});
