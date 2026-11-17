import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { api } from "../services/api";
import { renderizarApp, salvarSessao } from "../test/utils";

function coluna(nome) {
  return screen.findByRole("region", { name: nome });
}

describe("Report de Manutenção", () => {
  it("kanban com abertos, em andamento e finalizados", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/manutencao");

    const abertos = await coluna("Abertos");
    expect(within(abertos).getAllByRole("article")).toHaveLength(2);
    expect(within(await coluna("Em andamento")).getAllByRole("article")).toHaveLength(1);
    expect(within(await coluna("Finalizados")).getAllByRole("article")).toHaveLength(1);
    expect(within(abertos).getByText("2")).toBeTruthy(); // contador da coluna
    expect(api.get).toHaveBeenCalledWith("/api/chamados");
  });

  it("o card mostra quem abriu, notas, data e hora, setor, máquina e prioridade", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/manutencao");

    const card = within(await coluna("Abertos")).getByRole("article", { name: "Mecânico — Forno 02" });
    expect(within(card).getByText("Aberto por Fulano OPERARIO")).toBeTruthy();
    expect(within(card).getByText("Barulho estranho no motor.")).toBeTruthy();
    expect(within(card).getByText("17/11 13:20")).toBeTruthy();
    expect(within(card).getByText("Cozimento · Linha A")).toBeTruthy();
    expect(within(card).getByText("Alta")).toBeTruthy();
  });

  it("chamado automático aparece como aberto pelo sistema, crítico e primeiro da coluna", async () => {
    salvarSessao("ENGENHEIRO");
    renderizarApp("/manutencao");

    const cards = within(await coluna("Abertos")).getAllByRole("article");
    expect(cards[0].getAttribute("aria-label")).toBe("Temperatura — Forno 02");
    expect(within(cards[0]).getByText("Sistema — limite ultrapassado")).toBeTruthy();
    expect(within(cards[0]).getByText("Crítica")).toBeTruthy();
  });

  it("em andamento mostra o responsável; finalizado mostra a solução", async () => {
    salvarSessao("DIRETOR");
    renderizarApp("/manutencao");

    const emAndamento = within(await coluna("Em andamento")).getByRole("article", { name: "Parada — Envasadora 04" });
    expect(within(emAndamento).getByText("Responsável: Eng Beltrano")).toBeTruthy();
    const finalizado = within(await coluna("Finalizados")).getByRole("article", { name: "Elétrico — Envasadora 04" });
    expect(within(finalizado).getByText("Solução: Sensor trocado.")).toBeTruthy();
  });

  it("a lista suspensa filtra pela máquina", async () => {
    salvarSessao("OPERARIO");
    renderizarApp("/manutencao?maquina=m2");

    expect((await screen.findByRole("combobox", { name: "Máquina" })).value).toBe("m2");
    const abertos = await coluna("Abertos");
    expect(within(abertos).queryAllByRole("article")).toHaveLength(0);
    expect(within(abertos).getByText("Nenhum chamado")).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/api/chamados?maquinaId=m2");
  });

  it("ADMIN que abre /manutencao vai para Usuários", async () => {
    salvarSessao("ADMIN");
    renderizarApp("/manutencao");
    expect(await screen.findByRole("heading", { level: 1, name: "Usuários" })).toBeTruthy();
  });
});
