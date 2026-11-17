import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { renderizarApp, salvarSessao } from "../test/utils";

function linhaDe(nome) {
  return screen.getByRole("row", { name: new RegExp(nome) });
}

describe("tela Máquinas", () => {
  it("lista as máquinas com setor, linha, faixa e limite crítico", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/maquinas");

    await screen.findByRole("row", { name: /Forno 02/ });
    const forno = linhaDe("Forno 02");
    expect(within(forno).getByText("Cozimento")).toBeTruthy();
    expect(within(forno).getByText("Linha A")).toBeTruthy();
    expect(within(forno).getByText("160 a 200 °C")).toBeTruthy();
    expect(within(forno).getByText("abaixo de 140 / acima de 220 °C")).toBeTruthy();
  });

  it("DIRETOR só visualiza", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/maquinas");
    await screen.findByRole("row", { name: /Forno 02/ });

    expect(screen.queryByRole("button", { name: "Nova máquina" })).toBeNull();
    expect(within(linhaDe("Forno 02")).queryByRole("button", { name: "Editar" })).toBeNull();
  });

  it("ENGENHEIRO cria uma máquina com parâmetros e alertas, vendo o limite crítico", async () => {
    salvarSessao("ENGENHEIRO");
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { id: "m9" } });
    renderizarApp("/maquinas");
    await screen.findByRole("row", { name: /Forno 02/ });

    await userEvent.click(screen.getByRole("button", { name: "Nova máquina" }));
    await userEvent.type(screen.getByLabelText("Nome"), "Pasteurizador 07");
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "OUTRA");
    await userEvent.type(screen.getByLabelText("Setor"), "Pasteurização");
    await userEvent.type(screen.getByLabelText("Linha"), "Linha A");
    await userEvent.type(screen.getByLabelText("Temperatura mínima (°C)"), "0");
    await userEvent.type(screen.getByLabelText("Temperatura máxima (°C)"), "10");
    await userEvent.type(screen.getByLabelText("Potência ativa (kW)"), "7,5");

    expect(screen.getByText("Crítico abaixo de -5 °C ou acima de 15 °C")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(post).toHaveBeenCalledWith("/api/maquinas", expect.objectContaining({
      nome: "Pasteurizador 07",
      tipo: "OUTRA",
      setor: "Pasteurização",
      linha: "Linha A",
      faixaTemperatura: { min: 0, max: 10 },
      alertas: { percentualCritico: 50, minutosParadoMax: 15, taxaDefeitosMax: 8 },
      turnoPlanejado: { inicio: "06:00", fim: "22:00" },
      energia: { potenciaKw: 7.5, potenciaRegeneradaKw: 0, percentualRegeneracao: 0 },
    }));
    expect(await screen.findByText("Máquina criada.")).toBeTruthy();
  });

  it("mostra o erro do backend (nome duplicado)", async () => {
    salvarSessao("ENGENHEIRO");
    vi.spyOn(api, "post").mockRejectedValue({
      response: { status: 400, data: { status: 400, erro: "Já existe uma máquina com esse nome.", campos: { nome: "Já existe uma máquina com esse nome." } } },
    });
    renderizarApp("/maquinas");
    await screen.findByRole("row", { name: /Forno 02/ });

    await userEvent.click(screen.getByRole("button", { name: "Nova máquina" }));
    await userEvent.type(screen.getByLabelText("Nome"), "Forno 02");
    await userEvent.type(screen.getByLabelText("Setor"), "X");
    await userEvent.type(screen.getByLabelText("Linha"), "Linha A");
    await userEvent.type(screen.getByLabelText("Temperatura mínima (°C)"), "1");
    await userEvent.type(screen.getByLabelText("Temperatura máxima (°C)"), "2");
    await userEvent.type(screen.getByLabelText("Potência ativa (kW)"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Já existe uma máquina com esse nome.")).toBeTruthy();
  });

  it("faixa invertida não envia nada", async () => {
    salvarSessao("ENGENHEIRO");
    const post = vi.spyOn(api, "post");
    renderizarApp("/maquinas");
    await screen.findByRole("row", { name: /Forno 02/ });

    await userEvent.click(screen.getByRole("button", { name: "Nova máquina" }));
    await userEvent.type(screen.getByLabelText("Nome"), "X");
    await userEvent.type(screen.getByLabelText("Setor"), "X");
    await userEvent.type(screen.getByLabelText("Linha"), "X");
    await userEvent.type(screen.getByLabelText("Temperatura mínima (°C)"), "30");
    await userEvent.type(screen.getByLabelText("Temperatura máxima (°C)"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText("A temperatura mínima precisa ser menor que a máxima.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  async function abrirFormularioPreenchido() {
    await screen.findByRole("row", { name: /Forno 02/ });
    await userEvent.click(screen.getByRole("button", { name: "Nova máquina" }));
    await userEvent.type(screen.getByLabelText("Nome"), "Pasteurizador 07");
    await userEvent.type(screen.getByLabelText("Setor"), "Pasteurização");
    await userEvent.type(screen.getByLabelText("Linha"), "Linha A");
    await userEvent.type(screen.getByLabelText("Temperatura mínima (°C)"), "-5");
    await userEvent.type(screen.getByLabelText("Temperatura máxima (°C)"), "10");
    await userEvent.type(screen.getByLabelText("Potência ativa (kW)"), "11");
  }

  it("potência regenerada maior que a ativa não envia", async () => {
    salvarSessao("ENGENHEIRO");
    const post = vi.spyOn(api, "post");
    renderizarApp("/maquinas");
    await abrirFormularioPreenchido();

    await userEvent.clear(screen.getByLabelText("Potência regenerada (kW)"));
    await userEvent.type(screen.getByLabelText("Potência regenerada (kW)"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText("A potência regenerada não pode passar da potência ativa.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("editar traz a energia da máquina", async () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/maquinas");
    await screen.findByRole("row", { name: /Envasadora 04/ });
    await userEvent.click(within(linhaDe("Envasadora 04")).getByRole("button", { name: "Editar" }));

    expect(screen.getByLabelText("Potência ativa (kW)").value).toBe("11");
    expect(screen.getByLabelText("Potência regenerada (kW)").value).toBe("3");
    expect(screen.getByLabelText("Regeneração (% do tempo operando)").value).toBe("15");
  });

  it("número vazio ou quebrado não vira null no envio: o campo é apontado", async () => {
    salvarSessao("ENGENHEIRO");
    const post = vi.spyOn(api, "post");
    renderizarApp("/maquinas");
    await abrirFormularioPreenchido();

    await userEvent.clear(screen.getByLabelText("Cadência ideal (peças/min)"));
    await userEvent.clear(screen.getByLabelText("Crítico além da faixa (%)"));
    await userEvent.type(screen.getByLabelText("Crítico além da faixa (%)"), "50,5");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText("Cadência ideal (peças/min): informe um número inteiro de 1 a 10000.")).toBeTruthy();
    expect(screen.getByText("Crítico além da faixa (%): informe um número inteiro de 1 a 500.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("aceita vírgula como separador decimal", async () => {
    salvarSessao("ENGENHEIRO");
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { id: "m9" } });
    renderizarApp("/maquinas");
    await abrirFormularioPreenchido();

    await userEvent.clear(screen.getByLabelText("Valor por peça (R$)"));
    await userEvent.type(screen.getByLabelText("Valor por peça (R$)"), "2,75");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(post).toHaveBeenCalledWith("/api/maquinas", expect.objectContaining({
      valorPorPeca: 2.75,
      faixaTemperatura: { min: -5, max: 10 },
    }));
  });

  it("mostra cada campo recusado pelo backend com o nome do formulário", async () => {
    salvarSessao("ENGENHEIRO");
    vi.spyOn(api, "post").mockRejectedValue({
      response: { status: 400, data: { status: 400, erro: "Dados inválidos.", campos: { custoHora: "deve ser menor ou igual a 1000000" } } },
    });
    renderizarApp("/maquinas");
    await abrirFormularioPreenchido();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Dados inválidos.")).toBeTruthy();
    expect(screen.getByText("Custo por hora (R$): deve ser menor ou igual a 1000000")).toBeTruthy();
  });

  it("ENGENHEIRO desativa uma máquina", async () => {
    salvarSessao("ENGENHEIRO");
    const patch = vi.spyOn(api, "patch").mockResolvedValue({ data: {} });
    renderizarApp("/maquinas");
    await screen.findByRole("row", { name: /Forno 02/ });

    await userEvent.click(within(linhaDe("Forno 02")).getByRole("button", { name: "Desativar" }));

    expect(patch).toHaveBeenCalledWith("/api/maquinas/m1/ativa", { ativa: false });
  });
});
