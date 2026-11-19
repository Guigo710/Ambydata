import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { api, mensagemDeErro } from "../services/api";
import { CHAVE_CHAMADOS, NOME_DA_PRIORIDADE, NOME_DO_TIPO } from "../services/chamados";
import { porLinha } from "../services/maquinas";

// Abrir chamado (OPERARIO e ENGENHEIRO): máquina, tipo, prioridade e as notas do problema.
export default function FormChamado({ maquinas, maquinaInicial, onFechar, onAberto }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // maquinaId null = o usuário ainda não escolheu: vale a máquina do filtro (mesmo que a lista de
  // máquinas termine de carregar depois de o formulário abrir).
  const [campos, setCampos] = useState({ maquinaId: null, tipo: "MECANICO", prioridade: "MEDIA", descricao: "" });
  const maquinaId = campos.maquinaId ?? maquinaInicial ?? "";
  const [problemas, setProblemas] = useState([]);
  const abrir = useMutation({
    mutationFn: (dados) => api.post("/api/chamados", dados),
    onSuccess: () => {
      onAberto();
      return queryClient.invalidateQueries({ queryKey: CHAVE_CHAMADOS });
    },
  });
  const alterar = (nome) => (e) => setCampos({ ...campos, [nome]: e.target.value });
  const primeiroCampo = useRef(null);
  useEffect(() => primeiroCampo.current?.focus(), []);

  const enviar = (evento) => {
    evento.preventDefault();
    const erros = [];
    if (!maquinaId) erros.push(t("chamados.chooseMachineRequired"));
    if (!campos.descricao.trim()) erros.push(t("chamados.describeProblem"));
    setProblemas(erros);
    if (erros.length === 0) {
      abrir.mutate({ tipo: campos.tipo, maquinaId, descricao: campos.descricao.trim(), prioridade: campos.prioridade });
    }
  };

  const mensagens = problemas.length > 0 ? problemas : abrir.isError ? [mensagemDeErro(abrir.error)] : [];
  return (
    <section id="form-chamado" className="card painel-form" aria-labelledby="titulo-novo-chamado">
      <h2 id="titulo-novo-chamado" className="card-title">{t("chamados.open")}</h2>
      <form onSubmit={enviar} noValidate>
        {mensagens.length > 0 && (
          <div className="error-message" role="alert">
            {mensagens.length === 1 ? mensagens[0] : <ul className="lista-erros">{mensagens.map((m) => <li key={m}>{m}</li>)}</ul>}
          </div>
        )}
        <div className="form-colunas">
          <div className="input-group">
            <label htmlFor="chamado-maquina">{t("chamados.machine")}</label>
            <select id="chamado-maquina" ref={primeiroCampo} value={maquinaId} onChange={alterar("maquinaId")}>
              <option value="">{t("chamados.chooseMachine")}</option>
              {porLinha(maquinas).map(([linha, daLinha]) => (
                <optgroup key={linha} label={linha}>
                  {daLinha.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="chamado-tipo">{t("chamados.type")}</label>
            <select id="chamado-tipo" value={campos.tipo} onChange={alterar("tipo")}>
              {Object.keys(NOME_DO_TIPO).map((valor) => (
                <option key={valor} value={valor}>{t(`chamados.types.${valor}`)}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="chamado-prioridade">{t("chamados.priority")}</label>
            <select id="chamado-prioridade" value={campos.prioridade} onChange={alterar("prioridade")}>
              {Object.keys(NOME_DA_PRIORIDADE).map((valor) => (
                <option key={valor} value={valor}>{t(`chamados.priorities.${valor}`)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="chamado-notas">{t("chamados.notes")}</label>
          <textarea id="chamado-notas" rows={3} maxLength={1000} value={campos.descricao} onChange={alterar("descricao")}
            placeholder={t("chamados.notesPlaceholder")} />
        </div>
        <div className="form-acoes">
          <button type="button" className="btn-secundario" onClick={onFechar}>{t("common.cancel")}</button>
          <button type="submit" className="btn-primario" disabled={abrir.isPending}>
            {abrir.isPending ? t("chamados.submitting") : t("chamados.submit")}
          </button>
        </div>
      </form>
    </section>
  );
}
