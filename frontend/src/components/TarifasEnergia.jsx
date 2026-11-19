import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { api, mensagemDeErro } from "../services/api";
import { dinheiro, kw, tarifa } from "../services/indicadores";

const CAMPOS = [
  ["tarifaCheia", "energy.fullField", 0.01, 10],
  ["tarifaCompensavel", "energy.compensableField", 0, 10],
  ["demandaContratadaKw", "energy.contractedDemand", 0, 100000],
  ["tarifaDemanda", "energy.demandTariffField", 0, 1000],
];

const numero = (texto) => (String(texto).trim() === "" ? NaN : Number(String(texto).trim().replace(",", ".")));
const quando = (iso, locale) => new Date(iso).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function FormTarifas({ atuais, onFechar, onSalvo }) {
  const { t } = useTranslation();
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
      .map(([, chaveRotulo, min, max]) => `${t(chaveRotulo)}: ${t("energy.validation", { min, max })}`);
    if (erros.length === 0 && valores.tarifaCompensavel > valores.tarifaCheia) {
      erros.push(t("energy.compensableLimit"));
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
        {CAMPOS.map(([nome, chaveRotulo]) => (
          <div key={nome} className="input-group">
            <label htmlFor={`tarifa-${nome}`}>{t(chaveRotulo)}</label>
            <input id={`tarifa-${nome}`} value={campos[nome]} autoComplete="off"
              onChange={(e) => setCampos({ ...campos, [nome]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="form-acoes">
        <button type="button" className="btn-secundario" onClick={onFechar}>{t("energy.cancel")}</button>
        <button type="submit" className="btn-primario" disabled={salvar.isPending}>
          {salvar.isPending ? t("energy.saving") : t("energy.save")}
        </button>
      </div>
    </form>
  );
}

// Tarifas de energia da fábrica: o ENGENHEIRO edita; o DIRETOR só vê.
export default function TarifasEnergia({ tarifas, podeEditar }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "pt-BR";
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState(null);
  return (
    <section className="card espaco-acima" aria-label={t("energy.ariaLabel")}>
      <div className="comparativo-topo">
        <h2 className="card-title">{t("energy.title")}</h2>
        {podeEditar && !editando && (
          <button type="button" className="btn-secundario" onClick={() => { setAviso(null); setEditando(true); }}>{t("energy.edit")}</button>
        )}
      </div>
      {aviso && <div className="success-message" role="status">{aviso}</div>}
      {editando ? (
        <FormTarifas atuais={tarifas} onFechar={() => setEditando(false)}
          onSalvo={() => { setEditando(false); setAviso(t("energy.updated")); }} />
      ) : (
        <dl className="sobre-dados-lista">
          <div><dt>{t("energy.full")}</dt><dd>{`${tarifa(tarifas.tarifaCheia)}/kWh`}</dd></div>
          <div><dt>{t("energy.compensable")}</dt><dd>{`${tarifa(tarifas.tarifaCompensavel)}/kWh`}</dd></div>
          <div><dt>{t("energy.contractedDemand")}</dt><dd>{kw(tarifas.demandaContratadaKw)}</dd></div>
          <div><dt>{t("energy.demandTariff")}</dt><dd>{`${dinheiro(tarifas.tarifaDemanda)}/kW ${t("energy.perMonth")}`}</dd></div>
          {tarifas.atualizadoPor && (
            <div><dt>{t("energy.lastChange")}</dt><dd>
              {t("energy.updatedBy", { name: tarifas.atualizadoPor, date: quando(tarifas.atualizadoEm, locale) })}
            </dd></div>
          )}
        </dl>
      )}
    </section>
  );
}
