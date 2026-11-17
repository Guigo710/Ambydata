import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SobreEstesDados from "./SobreEstesDados";

const AGORA = new Date("2026-11-17T12:00:00Z").getTime();

describe("Sobre estes dados", () => {
  it("mostra máquina, fonte, frequência, última leitura e as fórmulas usadas", () => {
    render(
      <SobreEstesDados
        maquina="Forno 02"
        ultimaLeitura={{ instante: "2026-11-17T11:59:52Z", origem: "SIMULADOR" }}
        frequenciaSegundos={10}
        formulas={["oee", "disponibilidade"]}
        agora={AGORA}
      />,
    );

    const bloco = screen.getByRole("region", { name: "Sobre estes dados" });
    expect(bloco.textContent).toContain("Forno 02");
    expect(bloco.textContent).toContain("Simulador");
    expect(bloco.textContent).toContain("a cada 10 s");
    expect(bloco.textContent).toContain("há 8 s");
    expect(screen.getByText("OEE = Disponibilidade × Performance × Qualidade")).toBeTruthy();
    expect(screen.getByText("Disponibilidade = tempo operando ÷ tempo planejado do turno")).toBeTruthy();
  });

  it("sem leitura recente avisa em vez de inventar", () => {
    render(<SobreEstesDados maquina="Todas as máquinas" ultimaLeitura={null} frequenciaSegundos={10} formulas={[]} agora={AGORA} />);

    expect(screen.getByRole("region", { name: "Sobre estes dados" }).textContent).toContain("sem leituras");
  });

  it("dados de dispositivo aparecem como Dispositivo", () => {
    render(
      <SobreEstesDados maquina="Forno 02" ultimaLeitura={{ instante: "2026-11-17T11:59:00Z", origem: "DISPOSITIVO" }}
        frequenciaSegundos={10} formulas={[]} agora={AGORA} />,
    );
    expect(screen.getByRole("region", { name: "Sobre estes dados" }).textContent).toContain("Dispositivo");
  });
});
