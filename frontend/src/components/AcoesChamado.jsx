import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api, mensagemDeErro } from "../services/api";
import { CHAVE_CHAMADOS } from "../services/chamados";

// Botões do ENGENHEIRO no card: assumir (aberto), finalizar com a solução (em andamento) e
// cancelar com o motivo (aberto ou em andamento). O backend recusa ações fora de ordem (409),
// por exemplo se outro engenheiro assumiu antes: a mensagem aparece no card.
export default function AcoesChamado({ chamado }) {
  const queryClient = useQueryClient();
  const id = useId();
  const [modo, setModo] = useState(null); // null | "finalizar" | "cancelar"
  const [texto, setTexto] = useState("");
  const [faltando, setFaltando] = useState(null);
  const acao = useMutation({
    mutationFn: ({ caminho, corpo }) => (corpo
      ? api.post(`/api/chamados/${chamado.id}/${caminho}`, corpo)
      : api.post(`/api/chamados/${chamado.id}/${caminho}`)),
    onSuccess: () => setModo(null),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHAVE_CHAMADOS }),
  });

  const abrirModo = (novo) => {
    acao.reset();
    setTexto("");
    setFaltando(null);
    setModo(novo);
  };

  const confirmar = () => {
    if (!texto.trim()) {
      setFaltando(modo === "finalizar" ? "Descreva a solução." : "Informe o motivo.");
      return;
    }
    setFaltando(null);
    acao.mutate(modo === "finalizar"
      ? { caminho: "finalizar", corpo: { solucao: texto.trim() } }
      : { caminho: "cancelar", corpo: { motivo: texto.trim() } });
  };

  if (chamado.status !== "ABERTO" && chamado.status !== "EM_ANDAMENTO") return null;

  return (
    <div className="acoes-chamado">
      {acao.isError && <div className="error-message" role="alert">{mensagemDeErro(acao.error)}</div>}
      {modo ? (
        <div className="acoes-chamado-texto">
          <label htmlFor={`${id}-texto`}>{modo === "finalizar" ? "Solução" : "Motivo do cancelamento"}</label>
          <textarea id={`${id}-texto`} rows={2} maxLength={modo === "finalizar" ? 1000 : 500} value={texto}
            onChange={(e) => setTexto(e.target.value)} />
          {faltando && <p className="erro-campo" role="alert">{faltando}</p>}
          <div className="acoes-chamado-botoes">
            <button type="button" className="btn-link" onClick={() => setModo(null)}>Voltar</button>
            <button type="button" className="btn-primario btn-pequeno" disabled={acao.isPending} onClick={confirmar}>
              {modo === "finalizar" ? "Confirmar finalização" : "Confirmar cancelamento"}
            </button>
          </div>
        </div>
      ) : (
        <div className="acoes-chamado-botoes">
          {chamado.status === "ABERTO" && (
            <button type="button" className="btn-primario btn-pequeno" disabled={acao.isPending}
              onClick={() => { acao.reset(); acao.mutate({ caminho: "assumir" }); }}>Assumir</button>
          )}
          {chamado.status === "EM_ANDAMENTO" && (
            <button type="button" className="btn-primario btn-pequeno" onClick={() => abrirModo("finalizar")}>Finalizar</button>
          )}
          <button type="button" className="btn-link" onClick={() => abrirModo("cancelar")}>Cancelar chamado</button>
        </div>
      )}
    </div>
  );
}
