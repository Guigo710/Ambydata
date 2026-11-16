// Onde a sessão (token + usuário) fica guardada no navegador. Só o AuthContext usa
// estas funções; o resto do app lê a sessão pelo hook useAuth.
import { configurarSessao } from "../services/api";

export const CHAVE_SESSAO = "ambydata.sessao";

// Disparado quando o backend recusa o token durante o uso (401).
export const EVENTO_SESSAO_EXPIRADA = "ambydata:sessao-expirada";

export function lerSessao() {
  try {
    const sessao = JSON.parse(localStorage.getItem(CHAVE_SESSAO));
    if (!sessao?.token || !sessao?.usuario) {
      return null;
    }
    if (sessao.expiraEm && new Date(sessao.expiraEm) <= new Date()) {
      apagarSessao();
      return null;
    }
    return sessao;
  } catch {
    apagarSessao();
    return null;
  }
}

export function gravarSessao(sessao) {
  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch {
    // Navegação privada ou armazenamento cheio: a sessão vale só até recarregar.
  }
}

export function apagarSessao() {
  try {
    localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // Nada a apagar.
  }
}

// Liga o cliente da API à sessão: o token vem do armazenamento e um 401 vira o evento
// que o AuthProvider escuta para sair com aviso.
configurarSessao({
  obterToken: () => lerSessao()?.token ?? null,
  aoExpirar: () => window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA)),
});
