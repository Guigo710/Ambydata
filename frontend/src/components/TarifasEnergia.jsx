import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, mensagemDeErro } from "../services/api";
import { dinheiro, kw, tarifa } from "../services/indicadores";

const CAMPOS = [
  ["tarifaCheia", "Tarifa cheia, TE + TUSD (R$/kWh)", 0.01, 10],
  ["tarifaCompensavel", "Tarifa compensável (R$/kWh)", 0, 10],
  ["demandaContratadaKw", "Demanda contratada (kW)", 0, 100000],
  ["tarifaDemanda", "Tarifa de demanda (R$/kW por mês)", 0, 1000],
];

const numero = (texto) => (String(texto).trim() === "" ? NaN : Number(String(texto).trim().replace(",", ".")));
const quando = (iso) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function FormTarifas({ atuais, onFechar, onSalvo }) {
  const queryClient = useQueryClient();
  const [campos, setCampos] = useState(() => Object.fromEntries(CAMPOS.map(([nome]) => [nome, String(atuais[nome])])));
  const [problemas, setProblemas] = useState([]);
  const salvar = useMutation({
    mutationFn: (dados) => api.put("/api/energia/tarifas", dados),
    onSuccess: () => {
      onSalvo();
      return queryClient.invalidateQueries({ queryKey: ["indicadores", "energia"] });
    },
  });

  const enviar = (evento) => {
    evento.preventDefault();
    const valores = Object.fromEntries(CAMPOS.map(([nome]) => [nome, numero(campos[nome])]));
    const erros = CAMPOS
      .filter(([nome, , min, max]) => !(Number.isFinite(valores[nome]) && valores[nome] >= min && valores[nome] <= max))
      .map(([, rotulo, min, max]) => `${rotulo}: informe um número de ${String(min).replace(".", ",")} a ${max}.`);
    if (erros.length === 0 && valores.tarifaCompensavel > valores.tarifaCheia) {
      erros.push("A tarifa compensável não pode passar da tarifa cheia.");
    }
    setProblemas(erros);
    if (erros.length === 0) salvar.mutate(valores);
  };

  const mensagens = problemas.length > 0 ? problemas : salvar.isError ? [mensagemDeErro(salvar.error)] : [];
  return (
    <form onSubmit={enviar} noValidate className="form-tarifas">
      {mensagens.length > 0 && (
        <div className="error-message" role="alert">
          {mensagens.length === 1 ? mensagens[0] : <ul className="lista-erros">{mensagens.map((m) => <li key={m}>{m}</li>)}</ul>}
        </div>
      )}
      <div className="form-colunas">
        {CAMPOS.map(([nome, rotulo]) => (
          <div key={nome} className="input-group">
            <label htmlFor={`tarifa-${nome}`}>{rotulo}</label>
            <input id={`tarifa-${nome}`} value={campos[nome]} autoComplete="off"
              onChange={(e) => setCampos({ ...campos, [nome]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="form-acoes">
        <button type="button" className="btn-secundario" onClick={onFechar}>Cancelar</button>
        <button type="submit" className="btn-primario" disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar tarifas"}
        </button>
      </div>
    </form>
  );
}

// Tarifas de energia da fábrica: o ENGENHEIRO edita; o DIRETOR só vê.
export default function TarifasEnergia({ tarifas, podeEditar }) {
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState(null);
  return (
    <section className="card espaco-acima" aria-label="Tarifas da fábrica">
      <div className="comparativo-topo">
        <h2 className="card-title">Tarifas da fábrica</h2>
        {podeEditar && !editando && (
          <button type="button" className="btn-secundario" onClick={() => { setAviso(null); setEditando(true); }}>Editar tarifas</button>
        )}
      </div>
      {aviso && <div className="success-message" role="status">{aviso}</div>}
      {editando ? (
        <FormTarifas atuais={tarifas} onFechar={() => setEditando(false)}
          onSalvo={() => { setEditando(false); setAviso("Tarifas atualizadas."); }} />
      ) : (
        <dl className="sobre-dados-lista">
          <div><dt>Tarifa cheia (TE + TUSD)</dt><dd>{`${tarifa(tarifas.tarifaCheia)}/kWh`}</dd></div>
          <div><dt>Tarifa compensável</dt><dd>{`${tarifa(tarifas.tarifaCompensavel)}/kWh`}</dd></div>
          <div><dt>Demanda contratada</dt><dd>{kw(tarifas.demandaContratadaKw)}</dd></div>
          <div><dt>Tarifa de demanda</dt><dd>{`${dinheiro(tarifas.tarifaDemanda)}/kW por mês`}</dd></div>
          {tarifas.atualizadoPor && (
            <div><dt>Última alteração</dt><dd>{`${tarifas.atualizadoPor} em ${quando(tarifas.atualizadoEm)}`}</dd></div>
          )}
        </dl>
      )}
    </section>
  );
}
