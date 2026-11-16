// Quem vê qual tela. Fonte única para o menu e para as rotas protegidas; espelha a
// tabela "Telas por perfil" do SPEC-identity.md. O backend aplica as mesmas regras.

export const PERFIS = ["OPERARIO", "ENGENHEIRO", "DIRETOR", "ADMIN"];

const PRODUCAO = ["OPERARIO", "ENGENHEIRO", "DIRETOR"];

// Em ordem de exibição no menu.
export const TELAS = [
  { rota: "/painel", titulo: "Painel principal", perfis: PRODUCAO },
  { rota: "/status-maquina", titulo: "Status da Máquina", perfis: PRODUCAO },
  { rota: "/usuarios", titulo: "Usuários", perfis: ["ADMIN"] },
  { rota: "/meu-perfil", titulo: "Meu perfil", perfis: PERFIS },
];

export function podeAcessar(perfil, rota) {
  const tela = TELAS.find((t) => t.rota === rota);
  return Boolean(perfil && tela && tela.perfis.includes(perfil));
}

export function telasDoMenu(perfil) {
  return TELAS.filter((t) => t.perfis.includes(perfil));
}

// Para onde o usuário vai depois do login ou ao abrir uma tela sem permissão.
export function rotaInicial(perfil) {
  return perfil === "ADMIN" ? "/usuarios" : "/painel";
}
