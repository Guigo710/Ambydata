import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { renderizarApp, salvarSessao } from "../test/utils";

// Backend falso em memória: as chamadas leem e alteram esta lista.
let usuarios;
let proximoErro;

function erroDaApi(status, erro, campos) {
  return { response: { status, data: { status, erro, campos } } };
}

function backendFalso() {
  vi.spyOn(api, "get").mockImplementation(async () => ({ data: structuredClone(usuarios) }));
  vi.spyOn(api, "post").mockImplementation(async (url, corpo) => {
    if (proximoErro) throw proximoErro;
    const novo = { id: String(usuarios.length + 1), nome: corpo.nome, email: corpo.email, perfil: corpo.perfil, ativo: true };
    usuarios.push(novo);
    return { data: novo };
  });
  vi.spyOn(api, "put").mockImplementation(async (url, corpo) => {
    if (proximoErro) throw proximoErro;
    const id = url.split("/")[3];
    if (url.endsWith("/senha")) return { status: 204 };
    Object.assign(usuarios.find((u) => u.id === id), corpo);
    return { data: usuarios.find((u) => u.id === id) };
  });
  vi.spyOn(api, "patch").mockImplementation(async (url, corpo) => {
    if (proximoErro) throw proximoErro;
    const alvo = usuarios.find((u) => u.id === url.split("/")[3]);
    alvo.ativo = corpo.ativo;
    return { data: alvo };
  });
}

function linhaDe(nome) {
  return screen.getByRole("row", { name: new RegExp(nome) });
}

beforeEach(() => {
  usuarios = [
    { id: "1", nome: "Admin Geral", email: "admin@ambydata.demo", perfil: "ADMIN", ativo: true },
    { id: "2", nome: "Bia Souza", email: "bia@ambydata.demo", perfil: "OPERARIO", ativo: true },
    { id: "3", nome: "Caio Lima", email: "caio@ambydata.demo", perfil: "DIRETOR", ativo: false },
  ];
  proximoErro = null;
  salvarSessao("ADMIN", { usuario: { ...usuarios[0] } });
  backendFalso();
});
afterEach(() => vi.restoreAllMocks());

describe("tela de Usuários", () => {
  it("lista os usuários com perfil e situação", async () => {
    renderizarApp("/usuarios");

    expect(await screen.findByRole("row", { name: /Bia Souza/ })).toBeTruthy();
    expect(within(linhaDe("Bia Souza")).getByText("Operário")).toBeTruthy();
    expect(within(linhaDe("Bia Souza")).getByText("Ativo")).toBeTruthy();
    expect(within(linhaDe("Caio Lima")).getByText("Inativo")).toBeTruthy();
  });

  it("cria um usuário e atualiza a lista", async () => {
    renderizarApp("/usuarios");
    await screen.findByRole("row", { name: /Bia Souza/ });

    await userEvent.click(screen.getByRole("button", { name: "Novo usuário" }));
    await userEvent.type(screen.getByLabelText("Nome"), "Duda Reis");
    await userEvent.type(screen.getByLabelText("E-mail"), "  duda@ambydata.demo ");
    await userEvent.selectOptions(screen.getByLabelText("Perfil"), "ENGENHEIRO");
    await userEvent.type(screen.getByLabelText("Senha inicial"), "senha-da-duda");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(api.post).toHaveBeenCalledWith("/api/usuarios", {
      nome: "Duda Reis", email: "duda@ambydata.demo", perfil: "ENGENHEIRO", senha: "senha-da-duda",
    });
    expect(await screen.findByRole("row", { name: /Duda Reis/ })).toBeTruthy();
    expect(screen.getByText("Usuário criado.")).toBeTruthy();
  });

  it("mostra o erro de e-mail duplicado e mantém o formulário aberto", async () => {
    proximoErro = erroDaApi(400, "E-mail já cadastrado.", { email: "já cadastrado" });
    renderizarApp("/usuarios");
    await screen.findByRole("row", { name: /Bia Souza/ });

    await userEvent.click(screen.getByRole("button", { name: "Novo usuário" }));
    await userEvent.type(screen.getByLabelText("Nome"), "Outra Bia");
    await userEvent.type(screen.getByLabelText("E-mail"), "bia@ambydata.demo");
    await userEvent.type(screen.getByLabelText("Senha inicial"), "senha-qualquer");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("E-mail já cadastrado.")).toBeTruthy();
    expect(screen.getByLabelText("Nome")).toBeTruthy();
  });

  it("senha inicial curta não envia nada", async () => {
    renderizarApp("/usuarios");
    await screen.findByRole("row", { name: /Bia Souza/ });

    await userEvent.click(screen.getByRole("button", { name: "Novo usuário" }));
    await userEvent.type(screen.getByLabelText("Nome"), "Duda");
    await userEvent.type(screen.getByLabelText("E-mail"), "duda@ambydata.demo");
    await userEvent.type(screen.getByLabelText("Senha inicial"), "curta");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText("A senha precisa ter entre 8 e 72 caracteres.")).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("edita o perfil de um usuário", async () => {
    renderizarApp("/usuarios");
    await screen.findByRole("row", { name: /Bia Souza/ });

    await userEvent.click(within(linhaDe("Bia Souza")).getByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText("Nome").value).toBe("Bia Souza");
    expect(screen.queryByLabelText("Senha inicial")).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("Perfil"), "ENGENHEIRO");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(api.put).toHaveBeenCalledWith("/api/usuarios/2", { nome: "Bia Souza", email: "bia@ambydata.demo", perfil: "ENGENHEIRO" });
    expect(await within(linhaDe("Bia Souza")).findByText("Engenheiro")).toBeTruthy();
  });

  it("mostra a regra do último ADMIN vinda do backend", async () => {
    proximoErro = erroDaApi(409, "O sistema precisa de pelo menos um ADMIN ativo.");
    renderizarApp("/usuarios");
    await screen.findByRole("row", { name: /Admin Geral/ });

    await userEvent.click(within(linhaDe("Admin Geral")).getByRole("button", { name: "Editar" }));
    await userEvent.selectOptions(screen.getByLabelText("Perfil"), "DIRETOR");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("O sistema precisa de pelo menos um ADMIN ativo.")).toBeTruthy();
  });

  it("desativa e reativa um usuário", async () => {
    renderizarApp("/usuarios");
    await screen.findByRole("row", { name: /Bia Souza/ });

    await userEvent.click(within(linhaDe("Bia Souza")).getByRole("button", { name: "Desativar" }));
    expect(api.patch).toHaveBeenCalledWith("/api/usuarios/2/ativo", { ativo: false });
    expect(await within(linhaDe("Bia Souza")).findByText("Inativo")).toBeTruthy();

    await userEvent.click(within(linhaDe("Bia Souza")).getByRole("button", { name: "Ativar" }));
    expect(api.patch).toHaveBeenLastCalledWith("/api/usuarios/2/ativo", { ativo: true });
    expect(await within(linhaDe("Bia Souza")).findByText("Ativo")).toBeTruthy();
  });

  it("o ADMIN não pode desativar a si mesmo", async () => {
    renderizarApp("/usuarios");
    await screen.findByRole("row", { name: /Admin Geral/ });

    expect(within(linhaDe("Admin Geral")).getByRole("button", { name: "Desativar" }).disabled).toBe(true);
  });

  it("redefine a senha de um usuário", async () => {
    renderizarApp("/usuarios");
    await screen.findByRole("row", { name: /Bia Souza/ });

    await userEvent.click(within(linhaDe("Bia Souza")).getByRole("button", { name: "Redefinir senha" }));
    await userEvent.type(screen.getByLabelText("Nova senha"), "senha-provisoria-1");
    await userEvent.click(screen.getByRole("button", { name: "Redefinir" }));

    expect(api.put).toHaveBeenCalledWith("/api/usuarios/2/senha", { novaSenha: "senha-provisoria-1" });
    expect(await screen.findByText("Senha de Bia Souza redefinida. Informe a nova senha à pessoa.")).toBeTruthy();
  });

  it("avisa quando a lista não carrega", async () => {
    api.get.mockRejectedValue(new Error("Network Error"));
    renderizarApp("/usuarios");

    expect(await screen.findByText("Não foi possível conectar ao servidor. Tente mais tarde.")).toBeTruthy();
  });
});
