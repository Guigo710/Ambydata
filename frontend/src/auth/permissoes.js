// Quem vê qual tela. Fonte única para o menu e para as rotas protegidas; espelha a
// tabela "Telas por perfil" do SPEC-identity.md. O backend aplica as mesmas regras.

export const PERFIS = ["OPERARIO", "ENGENHEIRO", "DIRETOR", "ADMIN"];

// Como cada perfil aparece na interface.
export const NOME_DO_PERFIL = {
  OPERARIO: "Operário",
  ENGENHEIRO: "Engenheiro",
  DIRETOR: "Diretor",
  ADMIN: "Admin",
};

const PRODUCAO = ["OPERARIO", "ENGENHEIRO", "DIRETOR"];

// Em ordem de exibição no menu.
export const TELAS = [
  // comMaquina: a tela tem o seletor de máquina, e o menu leva a escolha (?maquina=) junto.
  { rota: "/painel", titulo: "Painel principal", perfis: PRODUCAO, comMaquina: true },
  { rota: "/status-maquina", titulo: "Status da Máquina", perfis: PRODUCAO, comMaquina: true },
  { rota: "/oee", titulo: "OEE", perfis: PRODUCAO, comMaquina: true },
  { rota: "/produtividade", titulo: "Produtividade", perfis: PRODUCAO, comMaquina: true },
  { rota: "/custos", titulo: "Custos e Lucros", perfis: ["DIRETOR"] },
  { rota: "/maquinas", titulo: "Máquinas", perfis: ["ENGENHEIRO", "DIRETOR"] },
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
