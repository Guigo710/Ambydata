import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { renderizarApp, salvarSessao } from "../test/utils";

async function card(coluna, titulo) {
  return within(await screen.findByRole("region", { name: coluna })).getByRole("article", { name: titulo });
}

describe("Report de Manutenção — ações", () => {
  it("OPERARIO abre um chamado pelo formulário", async () => {
    salvarSessao("OPERARIO");
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { id: "c9" } });
    renderizarApp("/manutencao");

    await userEvent.click(await screen.findByRole("button", { name: "Abrir chamado" }));
    await userEvent.selectOptions(screen.getByLabelText("Máquina do chamado"), "m1");
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "ELETRICO");
    await userEvent.selectOptions(screen.getByLabelText("Prioridade"), "ALTA");
    await userEvent.type(screen.getByLabelText("Notas"), "Painel desarmando sozinho.");
    await userEvent.click(screen.getByRole("button", { name: "Enviar chamado" }));

    expect(post).toHaveBeenCalledWith("/api/chamados",
      { tipo: "ELETRICO", maquinaId: "m1", descricao: "Painel desarmando sozinho.", prioridade: "ALTA" });
    expect(await screen.findByText("Chamado aberto.")).toBeTruthy();
  });

  it("o formulário pede máquina e notas", async () => {
    salvarSessao("OPERARIO");
    const post = vi.spyOn(api, "post");
    renderizarApp("/manutencao");
    await userEvent.click(await screen.findByRole("button", { name: "Abrir chamado" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar chamado" }));

    expect(screen.getByText("Escolha a máquina.")).toBeTruthy();
    expect(screen.getByText("Descreva o problema.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("o formulário já vem com a máquina do filtro, mesmo aberto antes de a lista carregar", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/manutencao?maquina=m2");
    await userEvent.click(await screen.findByRole("button", { name: "Abrir chamado" }));

    const maquina = screen.getByLabelText("Máquina do chamado");
    await within(maquina).findByRole("option", { name: "Envasadora 04", selected: true });
    expect(maquina.value).toBe("m2");
  });

  it("DIRETOR só acompanha; OPERARIO não tem os botões do engenheiro", async () => {
    salvarSessao("DIRETOR");
    const { unmount } = renderizarApp("/manutencao");
    await screen.findByRole("region", { name: "Abertos" });
    expect(screen.queryByRole("button", { name: "Abrir chamado" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Assumir" })).toBeNull();
    unmount();

    salvarSessao("OPERARIO");
    renderizarApp("/manutencao");
    await screen.findByRole("region", { name: "Abertos" });
    expect(screen.queryByRole("button", { name: "Assumir" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Finalizar" })).toBeNull();
  });

  it("ENGENHEIRO assume um chamado aberto", async () => {
    salvarSessao("ENGENHEIRO");
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: {} });
    renderizarApp("/manutencao");

    await userEvent.click(within(await card("Abertos", "Mecânico — Forno 02")).getByRole("button", { name: "Assumir" }));

    expect(post).toHaveBeenCalledWith("/api/chamados/c1/assumir");
  });

  it("se outro engenheiro assumiu antes, o aviso fica na tela mesmo com o card mudando de coluna", async () => {
    salvarSessao("ENGENHEIRO");
    let outroAssumiu = false;
    vi.spyOn(api, "post").mockImplementation(async () => {
      outroAssumiu = true;
      throw { response: { status: 409, data: { status: 409, erro: "Só um chamado aberto pode ser assumido; este está em andamento." } } };
    });
    const original = api.get.getMockImplementation();
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      const resposta = await original(url);
      if (outroAssumiu && url === "/api/chamados") {
        resposta.data = resposta.data.map((c) => (c.id === "c1" ? { ...c, status: "EM_ANDAMENTO", responsavel: { nome: "Outro Eng" } } : c));
      }
      return resposta;
    });
    renderizarApp("/manutencao");

    await userEvent.click(within(await card("Abertos", "Mecânico — Forno 02")).getByRole("button", { name: "Assumir" }));

    expect(await card("Em andamento", "Mecânico — Forno 02")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Só um chamado aberto pode ser assumido; este está em andamento.");
  });

  it("finalizar pede a solução", async () => {
    salvarSessao("ENGENHEIRO");
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: {} });
    renderizarApp("/manutencao");
    const emAndamento = await card("Em andamento", "Parada — Envasadora 04");

    await userEvent.click(within(emAndamento).getByRole("button", { name: "Finalizar" }));
    await userEvent.click(within(emAndamento).getByRole("button", { name: "Confirmar finalização" }));
    expect(within(emAndamento).getByText("Descreva a solução.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();

    await userEvent.type(within(emAndamento).getByLabelText("Solução"), "Correia da esteira trocada.");
    await userEvent.click(within(emAndamento).getByRole("button", { name: "Confirmar finalização" }));

    expect(post).toHaveBeenCalledWith("/api/chamados/c3/finalizar", { solucao: "Correia da esteira trocada." });
  });

  it("cancelar pede o motivo", async () => {
    salvarSessao("ENGENHEIRO");
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: {} });
    renderizarApp("/manutencao");
    const aberto = await card("Abertos", "Mecânico — Forno 02");

    await userEvent.click(within(aberto).getByRole("button", { name: "Cancelar chamado" }));
    await userEvent.type(within(aberto).getByLabelText("Motivo do cancelamento"), "Aberto em duplicidade.");
    await userEvent.click(within(aberto).getByRole("button", { name: "Confirmar cancelamento" }));

    expect(post).toHaveBeenCalledWith("/api/chamados/c1/cancelar", { motivo: "Aberto em duplicidade." });
  });

  it("o detalhe mostra o histórico", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/manutencao");

    await userEvent.click(within(await card("Em andamento", "Parada — Envasadora 04")).getByRole("button", { name: "Ver detalhes" }));

    const detalhe = await screen.findByRole("dialog", { name: "Parada — Envasadora 04" });
    const historico = within(detalhe).getByRole("list", { name: "Histórico" });
    expect(within(historico).getAllByRole("listitem")).toHaveLength(2);
    expect(within(historico).getByText("Assumido.")).toBeTruthy();
    expect(within(historico).getByText("17/11 10:30 · Eng Beltrano")).toBeTruthy();

    await userEvent.click(within(detalhe).getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("o detalhe isola o resto da tela e devolve o foco ao fechar", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/manutencao");
    const botao = within(await card("Em andamento", "Parada — Envasadora 04")).getByRole("button", { name: "Ver detalhes" });

    await userEvent.click(botao);
    await screen.findByRole("dialog", { name: "Parada — Envasadora 04" });
    expect(document.querySelector(".layout").hasAttribute("inert")).toBe(true);

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector(".layout").hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(botao);
  });

  it("o formulário recebe o foco ao abrir e devolve ao botão ao fechar", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/manutencao");
    const abrir = await screen.findByRole("button", { name: "Abrir chamado" });

    await userEvent.click(abrir);
    expect(document.activeElement).toBe(screen.getByLabelText("Máquina do chamado"));
    expect(abrir.getAttribute("aria-expanded")).toBe("true");

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(document.activeElement).toBe(abrir);
  });

  it("o link da notificação abre o chamado direto", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/manutencao?chamado=c4");

    const detalhe = await screen.findByRole("dialog", { name: "Elétrico — Envasadora 04" });
    expect(within(detalhe).getByText("Sensor trocado.")).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/api/chamados/c4");
  });
});
