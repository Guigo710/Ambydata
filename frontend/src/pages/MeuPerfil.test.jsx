import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { renderizarApp, salvarSessao } from "../test/utils";

async function preencher({ atual = "senha-atual-1", nova = "senha-nova-123", confirmacao = nova } = {}) {
  await userEvent.type(screen.getByLabelText("Senha atual"), atual);
  await userEvent.type(screen.getByLabelText("Nova senha"), nova);
  await userEvent.type(screen.getByLabelText("Confirme a nova senha"), confirmacao);
  await userEvent.click(screen.getByRole("button", { name: "Alterar senha" }));
}

beforeEach(() => {
  salvarSessao("OPERARIO", { usuario: { id: "1", nome: "Bia Souza", email: "bia@ambydata.demo", perfil: "OPERARIO", ativo: true } });
});
afterEach(() => vi.restoreAllMocks());

describe("Meu perfil", () => {
  it("mostra nome, e-mail e perfil do usuário", () => {
    renderizarApp("/meu-perfil");
    const main = screen.getByRole("main");
    expect(main.textContent).toContain("Bia Souza");
    expect(main.textContent).toContain("bia@ambydata.demo");
    expect(main.textContent).toContain("Operário");
  });

  it("troca a senha e limpa o formulário", async () => {
    const put = vi.spyOn(api, "put").mockResolvedValue({ status: 204 });
    renderizarApp("/meu-perfil");

    await preencher();

    expect(put).toHaveBeenCalledWith("/api/auth/me/senha", { senhaAtual: "senha-atual-1", novaSenha: "senha-nova-123" });
    expect(await screen.findByText("Senha alterada com sucesso.")).toBeTruthy();
    expect(screen.getByLabelText("Senha atual").value).toBe("");
  });

  it("confirmação diferente não envia nada", async () => {
    const put = vi.spyOn(api, "put");
    renderizarApp("/meu-perfil");

    await preencher({ confirmacao: "outra-senha-123" });

    expect(screen.getByText("A confirmação não confere com a nova senha.")).toBeTruthy();
    expect(put).not.toHaveBeenCalled();
  });

  it("nova senha curta não envia nada", async () => {
    const put = vi.spyOn(api, "put");
    renderizarApp("/meu-perfil");

    await preencher({ nova: "curta" });

    expect(screen.getByText("A nova senha precisa ter entre 8 e 72 caracteres.")).toBeTruthy();
    expect(put).not.toHaveBeenCalled();
  });

  it("mostra o erro do backend quando a senha atual está errada", async () => {
    vi.spyOn(api, "put").mockRejectedValue({ response: { status: 400, data: { status: 400, erro: "Senha atual incorreta." } } });
    renderizarApp("/meu-perfil");

    await preencher();

    expect(await screen.findByText("Senha atual incorreta.")).toBeTruthy();
    expect(screen.queryByText("Senha alterada com sucesso.")).toBeNull();
  });
});
