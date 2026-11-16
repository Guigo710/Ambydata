// Cliente único da API. Toda chamada ao backend passa por aqui: o endereço vem de
// VITE_API_URL, o token da sessão é anexado sozinho e um 401 encerra a sessão.
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

// O AuthContext registra aqui como ler o token e o que fazer quando ele expira,
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
    if (erro.response?.status === 401 && !eLogin) {
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
  return "Não foi possível conectar ao servidor. Tente mais tarde.";
}
