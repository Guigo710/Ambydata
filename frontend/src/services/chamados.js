// Chamados de manutenção (/api/chamados) e o que a tela mostra deles.
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export const INTERVALO_KANBAN = 10_000;
export const CHAVE_CHAMADOS = ["chamados"];

export function useChamados(maquinaId) {
  return useQuery({
    queryKey: [...CHAVE_CHAMADOS, "lista", maquinaId ?? "todas"],
    queryFn: () => api.get(`/api/chamados${maquinaId ? `?maquinaId=${encodeURIComponent(maquinaId)}` : ""}`).then((r) => r.data),
    refetchInterval: INTERVALO_KANBAN,
  });
}

export const NOME_DO_TIPO = {
  MECANICO: "Mecânico", ELETRICO: "Elétrico", TEMPERATURA: "Temperatura",
  QUALIDADE: "Qualidade", PARADA: "Parada", OUTRO: "Outro",
};
export const NOME_DA_PRIORIDADE = { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", CRITICA: "Crítica" };
const PESO_DA_PRIORIDADE = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };

export const tituloDoChamado = (c) => `${NOME_DO_TIPO[c.tipo] ?? c.tipo} — ${c.maquinaNome}`;

// "17/11 13:20", no fuso do navegador.
export function dataHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const dois = (n) => String(n).padStart(2, "0");
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

const tempo = (iso) => (iso ? Date.parse(iso) : 0);

// As três colunas do kanban: abertos por prioridade (o mais antigo primeiro dentro dela),
// em andamento pelo mais recente assumido, finalizados pelo mais recente.
export function colunasDoKanban(chamados) {
  return {
    abertos: chamados.filter((c) => c.status === "ABERTO")
      .sort((a, b) => PESO_DA_PRIORIDADE[a.prioridade] - PESO_DA_PRIORIDADE[b.prioridade] || tempo(a.abertoEm) - tempo(b.abertoEm)),
    emAndamento: chamados.filter((c) => c.status === "EM_ANDAMENTO").sort((a, b) => tempo(b.assumidoEm) - tempo(a.assumidoEm)),
    finalizados: chamados.filter((c) => c.status === "FINALIZADO").sort((a, b) => tempo(b.finalizadoEm) - tempo(a.finalizadoEm)),
  };
}
