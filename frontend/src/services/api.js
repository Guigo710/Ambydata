// Cliente único da API. Toda chamada ao backend passa por aqui: o endereço vem de
// VITE_API_URL, o token da sessão é anexado sozinho e um 401 encerra a sessão.
import axios from "axios";
import i18n from "../i18n";

// Em desenvolvimento, sem VITE_API_URL, usa o backend local. Em produção, nunca:
// sem a variável as chamadas vão para a própria origem e falham, em vez de mandar
// e-mail e senha para http://localhost:8080 da máquina de quem usa.
export function resolverEnderecoDaApi(env) {
  if (env.VITE_API_URL) {
    return env.VITE_API_URL;
  }
  return env.DEV ? "http://localhost:8080" : undefined;
}

export const api = axios.create({
  baseURL: resolverEnderecoDaApi(import.meta.env),
});

// Registrado por auth/sessao.js: como ler o token e o que fazer quando ele expira,
// sem que este módulo precise conhecer o React.
let sessao = { obterToken: () => null, aoExpirar: () => {} };

export function configurarSessao(novaSessao) {
  sessao = novaSessao;
}

api.interceptors.request.use((config) => {
  const token = sessao.obterToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const eLogin = erro.config?.url?.endsWith("/api/auth/login");
    // Um 401 de uma requisição feita com um token antigo (antes de um novo login)
    // não derruba a sessão atual.
    const tokenAtual = sessao.obterToken();
    const enviadaComTokenAtual = Boolean(tokenAtual)
      && erro.config?.headers?.Authorization === `Bearer ${tokenAtual}`;
    if (erro.response?.status === 401 && !eLogin && enviadaComTokenAtual) {
      sessao.aoExpirar();
    }
    return Promise.reject(erro);
  },
);

// Texto para mostrar ao usuário a partir de um erro da API ({ status, erro, campos }).
export function mensagemDeErro(erro) {
  const doServidor = erro?.response?.data?.erro;
  if (doServidor) {
    return doServidor;
  }
  return i18n.t("errors.connection");
}
