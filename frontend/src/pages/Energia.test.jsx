import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { energiaDeTeste } from "../test/setup";
import { renderizarApp, salvarSessao } from "../test/utils";

describe("Energia", () => {
  it("total da fábrica: entrada, injetado, encargos e custo líquido", async () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/energia");

    const total = await screen.findByRole("region", { name: "Total da fábrica" });
    expect(within(total).getByText("807 kWh")).toBeTruthy();           // 675 + 132
    expect(within(total).getByText("R$ 685,95")).toBeTruthy();         // 573,75 + 112,20
    expect(within(total).getByText("R$ 2,97")).toBeTruthy();           // crédito da injetada
    expect(within(total).getByText("R$ 200,00")).toBeTruthy();         // encargos de demanda
    expect(within(total).getByText("R$ 882,98")).toBeTruthy();         // líquido
    expect(api.get).toHaveBeenCalledWith("/api/indicadores/energia?periodo=24h");
  });

  it("cada máquina mostra a conta com os números", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/energia");

    const tabela = await screen.findByRole("table", { name: "Por máquina" });
    const envasadora = within(tabela).getByRole("row", { name: /Envasadora 04/ });
    expect(within(envasadora).getByText("11 kW × 12 h = 132 kWh")).toBeTruthy();
    expect(within(envasadora).getByText("R$ 112,20")).toBeTruthy();
    expect(within(envasadora).getByText("3 kW × 1,8 h = 5,4 kWh")).toBeTruthy();
    expect(within(envasadora).getByText("R$ 2,97")).toBeTruthy();
    expect(within(envasadora).getByText("R$ 109,23")).toBeTruthy();
    const forno = within(tabela).getByRole("row", { name: /Forno 02/ });
    expect(within(forno).getByText("não regenera")).toBeTruthy();
    expect(within(screen.getByRole("table", { name: "Por linha" })).getByRole("row", { name: /Linha B/ })).toBeTruthy();
  });

  it("máquina sem potência cadastrada é apontada", async () => {
    salvarSessao("ENGENHEIRO");
    const original = api.get.getMockImplementation();
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      if (url.startsWith("/api/indicadores/energia")) {
        const dados = energiaDeTeste("24h");
        dados.maquinas[0] = { ...dados.maquinas[0], semParametros: true, energia: null, balanco: null };
        return { data: dados };
      }
      return original(url);
    });
    renderizarApp("/energia");

    const forno = within(await screen.findByRole("table", { name: "Por máquina" })).getByRole("row", { name: /Forno 02/ });
    expect(within(forno).getByText("Potência não cadastrada")).toBeTruthy();
  });

  it("DIRETOR vê as tarifas mas não edita", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/energia");
    const tarifas = await screen.findByRole("region", { name: "Tarifas da fábrica" });
    expect(within(tarifas).getByText("R$ 0,85/kWh")).toBeTruthy();
    expect(within(tarifas).queryByRole("button", { name: "Editar tarifas" })).toBeNull();
  });

  it("ENGENHEIRO edita as tarifas", async () => {
    salvarSessao("ENGENHEIRO");
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: {} });
    renderizarApp("/energia");
    const tarifas = await screen.findByRole("region", { name: "Tarifas da fábrica" });

    await userEvent.click(within(tarifas).getByRole("button", { name: "Editar tarifas" }));
    const campo = screen.getByLabelText("Tarifa cheia, TE + TUSD (R$/kWh)");
    await userEvent.clear(campo);
    await userEvent.type(campo, "0,92");
    await userEvent.click(screen.getByRole("button", { name: "Salvar tarifas" }));

    expect(put).toHaveBeenCalledWith("/api/energia/tarifas",
      { tarifaCheia: 0.92, tarifaCompensavel: 0.55, demandaContratadaKw: 150, tarifaDemanda: 40 });
    expect(await screen.findByText("Tarifas atualizadas.")).toBeTruthy();
  });

  it("tarifa compensável maior que a cheia não envia", async () => {
    salvarSessao("ENGENHEIRO");
    const put = vi.spyOn(api, "put");
    renderizarApp("/energia");
    await userEvent.click(await screen.findByRole("button", { name: "Editar tarifas" }));

    const compensavel = screen.getByLabelText("Tarifa compensável (R$/kWh)");
    await userEvent.clear(compensavel);
    await userEvent.type(compensavel, "1,2");
    await userEvent.click(screen.getByRole("button", { name: "Salvar tarifas" }));

    expect(screen.getByText("A tarifa compensável não pode passar da tarifa cheia.")).toBeTruthy();
    expect(put).not.toHaveBeenCalled();
  });

  it("troca para 7 dias", async () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/energia");
    await screen.findByRole("region", { name: "Total da fábrica" });
    await userEvent.click(screen.getByRole("radio", { name: "7 dias" }));
    expect(await screen.findByText("R$ 1.400,00")).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/api/indicadores/energia?periodo=7d");
  });

  it("OPERARIO que abre /energia volta para o Painel", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/energia");
    expect(await screen.findByRole("heading", { level: 1, name: "Painel Principal" })).toBeTruthy();
  });

  it("diz de onde vêm os dados e mostra as fórmulas", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/energia");
    const sobre = await screen.findByRole("region", { name: "Sobre estes dados" });
    expect(sobre.textContent).toContain("a cada hora fechada");
    expect(within(sobre).getByText("Custo líquido = custo de entrada − valor injetado + encargos/demanda")).toBeTruthy();
  });
});
