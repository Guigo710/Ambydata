// Onde a sessão (token + usuário) fica guardada no navegador. Só o AuthContext usa
// estas funções; o resto do app lê a sessão pelo hook useAuth.
import { configurarSessao } from "../services/api";

export const CHAVE_SESSAO = "ambydata.sessao";

// Disparado quando o backend recusa o token durante o uso (401).
export const EVENTO_SESSAO_EXPIRADA = "ambydata:sessao-expirada";

// Cópia em memória da sessão desta aba. É a fonte do token das requisições: continua
// valendo se o navegador bloquear o localStorage e não muda se outra aba entrar
// com outro usuário.
let emMemoria = null;

export function venceu(sessao) {
  return Boolean(sessao?.expiraEm) && new Date(sessao.expiraEm) <= new Date();
}

// Sessão salva ao abrir o app, e se ela existia mas já tinha vencido.
export function lerSessaoSalva() {
  let salva;
  try {
    salva = JSON.parse(localStorage.getItem(CHAVE_SESSAO));
  } catch {
    salva = null;
  }
  if (!salva?.token || !salva?.usuario) {
    apagarSessao();
    return { sessao: null, expirada: false };
  }
  if (venceu(salva)) {
    apagarSessao();
    return { sessao: null, expirada: true };
  }
  emMemoria = salva;
  return { sessao: salva, expirada: false };
}

export function gravarSessao(sessao) {
  emMemoria = sessao;
  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch {
    // Navegação privada ou armazenamento cheio: a sessão vale nesta aba até recarregar.
  }
}

export function apagarSessao() {
  emMemoria = null;
  try {
    localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // Nada a apagar.
  }
}

function tokenAtual() {
  if (!emMemoria || venceu(emMemoria)) {
    return null;
  }
  return emMemoria.token;
}

// Liga o cliente da API à sessão: o token vem do armazenamento e um 401 vira o evento
// que o AuthProvider escuta para sair com aviso.
configurarSessao({
  obterToken: tokenAtual,
  aoExpirar: () => window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA)),
});
