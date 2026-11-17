// Notificações do usuário logado (/api/notificacoes), para o sino da barra superior.
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export const INTERVALO_NOTIFICACOES = 15_000;
export const CHAVE_NOTIFICACOES = ["notificacoes"];

export function useNotificacoes(habilitado) {
  return useQuery({
    queryKey: CHAVE_NOTIFICACOES,
    queryFn: () => api.get("/api/notificacoes").then((r) => r.data),
    enabled: habilitado,
    refetchInterval: INTERVALO_NOTIFICACOES,
  });
}

// O link vem do servidor; mesmo assim, só segue o que as notificações de fato geram (lista
// permitida): "/\\evil.com" e afins viram o Report de Manutenção.
const LINK_PERMITIDO = /^\/manutencao(\?chamado=[A-Za-z0-9]{1,64})?$/;
export function linkSeguro(link) {
  return typeof link === "string" && LINK_PERMITIDO.test(link) ? link : "/manutencao";
}
