import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, mensagemDeErro } from "../services/api";
import { CHAVE_CHAMADOS, NOME_DA_PRIORIDADE, NOME_DO_TIPO } from "../services/chamados";
import { porLinha } from "../services/maquinas";

// Abrir chamado (OPERARIO e ENGENHEIRO): máquina, tipo, prioridade e as notas do problema.
export default function FormChamado({ maquinas, maquinaInicial, onFechar, onAberto }) {
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
    if (!maquinaId) erros.push("Escolha a máquina.");
    if (!campos.descricao.trim()) erros.push("Descreva o problema.");
    setProblemas(erros);
    if (erros.length === 0) {
      abrir.mutate({ tipo: campos.tipo, maquinaId, descricao: campos.descricao.trim(), prioridade: campos.prioridade });
    }
  };

  const mensagens = problemas.length > 0 ? problemas : abrir.isError ? [mensagemDeErro(abrir.error)] : [];
  return (
    <section id="form-chamado" className="card painel-form" aria-labelledby="titulo-novo-chamado">
      <h2 id="titulo-novo-chamado" className="card-title">Abrir chamado</h2>
      <form onSubmit={enviar} noValidate>
        {mensagens.length > 0 && (
          <div className="error-message" role="alert">
            {mensagens.length === 1 ? mensagens[0] : <ul className="lista-erros">{mensagens.map((m) => <li key={m}>{m}</li>)}</ul>}
          </div>
        )}
        <div className="form-colunas">
          <div className="input-group">
            <label htmlFor="chamado-maquina">Máquina do chamado</label>
            <select id="chamado-maquina" ref={primeiroCampo} value={maquinaId} onChange={alterar("maquinaId")}>
              <option value="">Escolha a máquina</option>
              {porLinha(maquinas).map(([linha, daLinha]) => (
                <optgroup key={linha} label={linha}>
                  {daLinha.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="chamado-tipo">Tipo</label>
            <select id="chamado-tipo" value={campos.tipo} onChange={alterar("tipo")}>
              {Object.entries(NOME_DO_TIPO).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="chamado-prioridade">Prioridade</label>
            <select id="chamado-prioridade" value={campos.prioridade} onChange={alterar("prioridade")}>
              {Object.entries(NOME_DA_PRIORIDADE).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
            </select>
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="chamado-notas">Notas</label>
          <textarea id="chamado-notas" rows={3} maxLength={1000} value={campos.descricao} onChange={alterar("descricao")}
            placeholder="O que está acontecendo? Desde quando? O que já foi tentado?" />
        </div>
        <div className="form-acoes">
          <button type="button" className="btn-secundario" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn-primario" disabled={abrir.isPending}>{abrir.isPending ? "Enviando..." : "Enviar chamado"}</button>
        </div>
      </form>
    </section>
  );
}
