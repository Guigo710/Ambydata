import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useId, useState } from "react";
import { api, mensagemDeErro } from "../services/api";
import { CHAVE_CHAMADOS } from "../services/chamados";

// Botões do ENGENHEIRO no card: assumir (aberto), finalizar com a solução (em andamento) e
// cancelar com o motivo (aberto ou em andamento). O backend recusa ações fora de ordem (409),
// por exemplo se outro engenheiro assumiu antes. A mensagem vai para a tela (onErro), porque o
// card pode mudar de coluna (e ser remontado) quando a lista é atualizada.
export default function AcoesChamado({ chamado, onErro }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const id = useId();
  const [modo, setModo] = useState(null); // null | "finalizar" | "cancelar"
  const [texto, setTexto] = useState("");
  const [faltando, setFaltando] = useState(null);
  const acao = useMutation({
    mutationFn: ({ caminho, corpo }) => (corpo
      ? api.post(`/api/chamados/${chamado.id}/${caminho}`, corpo)
      : api.post(`/api/chamados/${chamado.id}/${caminho}`)),
    onSuccess: () => {
      setModo(null);
      onErro(null);
    },
    onError: (erro) => onErro(mensagemDeErro(erro)),
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
      setFaltando(modo === "finalizar" ? t("chamados.describeSolution") : t("chamados.provideReason"));
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
      {modo ? (
        <div className="acoes-chamado-texto">
          <label htmlFor={`${id}-texto`}>{modo === "finalizar" ? t("chamados.solution") : t("chamados.cancelReason")}</label>
          <textarea id={`${id}-texto`} rows={2} maxLength={modo === "finalizar" ? 1000 : 500} value={texto}
            onChange={(e) => setTexto(e.target.value)} />
          {faltando && <p className="erro-campo" role="alert">{faltando}</p>}
          <div className="acoes-chamado-botoes">
            <button type="button" className="btn-link" onClick={() => setModo(null)}>{t("common.back")}</button>
            <button type="button" className="btn-primario btn-pequeno" disabled={acao.isPending} onClick={confirmar}>
              {modo === "finalizar" ? t("chamados.confirmFinish") : t("chamados.confirmCancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="acoes-chamado-botoes">
          {chamado.status === "ABERTO" && (
            <button type="button" className="btn-primario btn-pequeno" disabled={acao.isPending}
              onClick={() => { acao.reset(); acao.mutate({ caminho: "assumir" }); }}>{t("chamados.assume")}</button>
          )}
          {chamado.status === "EM_ANDAMENTO" && (
            <button type="button" className="btn-primario btn-pequeno" onClick={() => abrirModo("finalizar")}>{t("chamados.finish")}</button>
          )}
          <button type="button" className="btn-link" onClick={() => abrirModo("cancelar")}>{t("chamados.cancelAction")}</button>
        </div>
      )}
    </div>
  );
}
