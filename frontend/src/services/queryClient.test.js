import { describe, expect, it } from "vitest";
import { deveRepetir } from "./queryClient";

describe("política de nova tentativa das consultas", () => {
  it("não repete quando o servidor respondeu (401, 403, 404, 500...)", () => {
    for (const status of [400, 401, 403, 404, 409, 500]) {
      expect(deveRepetir(0, { response: { status } })).toBe(false);
    }
  });

  it("repete até 2 vezes quando a rede falhou", () => {
    const semResposta = new Error("Network Error");
    expect(deveRepetir(0, semResposta)).toBe(true);
    expect(deveRepetir(1, semResposta)).toBe(true);
    expect(deveRepetir(2, semResposta)).toBe(false);
  });
});
