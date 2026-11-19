import { useTranslation } from "react-i18next";
import { useState } from "react";
import { TIPOS_DE_MAQUINA, faixaCritica, formatarNumero } from "../services/maquinas";

// Campos numéricos: rótulo, caminho no JSON da API e limites (os mesmos do backend).
// Validar aqui evita mandar null (Number("") vira NaN, que o JSON transforma em null).
const NUMERICOS = {
  cadenciaIdeal: { chaveRotulo: "machines.fields.cadence", api: "cadenciaIdeal", min: 1, max: 10000, inteiro: true },
  custoHora: { chaveRotulo: "machines.fields.hourlyCost", api: "custoHora", min: 0, max: 1000000 },
  valorPorPeca: { chaveRotulo: "machines.fields.pieceValue", api: "valorPorPeca", min: 0, max: 1000000 },
  tempMin: { chaveRotulo: "machines.fields.minTemperature", api: "faixaTemperatura.min", min: -100, max: 1000 },
  tempMax: { chaveRotulo: "machines.fields.maxTemperature", api: "faixaTemperatura.max", min: -100, max: 1000 },
  percentualCritico: { chaveRotulo: "machines.fields.criticalPercent", api: "alertas.percentualCritico", min: 1, max: 500, inteiro: true },
  minutosParadoMax: { chaveRotulo: "machines.fields.criticalDowntime", api: "alertas.minutosParadoMax", min: 1, max: 480, inteiro: true },
  taxaDefeitosMax: { chaveRotulo: "machines.fields.criticalDefects", api: "alertas.taxaDefeitosMax", min: 0.1, max: 100 },
  potenciaKw: { chaveRotulo: "machines.fields.activePower", api: "energia.potenciaKw", min: 0.1, max: 10000 },
  potenciaRegeneradaKw: { chaveRotulo: "machines.fields.regeneratedPower", api: "energia.potenciaRegeneradaKw", min: 0, max: 10000 },
  percentualRegeneracao: { chaveRotulo: "machines.fields.regenerationPercent", api: "energia.percentualRegeneracao", min: 0, max: 100, inteiro: true },
};

// Rótulo de cada campo que o backend pode recusar (chave de `campos` na resposta de erro).
const ROTULOS_DA_API = {
  nome: "machines.fields.name", tipo: "machines.fields.type", setor: "machines.fields.sector", linha: "machines.fields.line",
  faixaTemperatura: "machines.fields.temperatureRange", energia: "machines.fields.energy",
  turnoPlanejado: "machines.fields.shift",
  "turnoPlanejado.inicio": "machines.fields.shiftStart",
  "turnoPlanejado.fim": "machines.fields.shiftEnd",
  ...Object.fromEntries(Object.values(NUMERICOS).map((c) => [c.api, c.chaveRotulo])),
};

const PADRAO = {
  nome: "", tipo: "OUTRA", setor: "", linha: "", cadenciaIdeal: "60",
  tempMin: "", tempMax: "", percentualCritico: "50", minutosParadoMax: "15", taxaDefeitosMax: "8",
  custoHora: "100", valorPorPeca: "2", turnoInicio: "06:00", turnoFim: "22:00",
  potenciaKw: "", potenciaRegeneradaKw: "0", percentualRegeneracao: "0",
};

function camposDe(maquina) {
  if (!maquina) return PADRAO;
  return {
    nome: maquina.nome, tipo: maquina.tipo, setor: maquina.setor, linha: maquina.linha,
    cadenciaIdeal: String(maquina.cadenciaIdeal),
    tempMin: String(maquina.faixaTemperatura.min), tempMax: String(maquina.faixaTemperatura.max),
    percentualCritico: String(maquina.alertas.percentualCritico),
    minutosParadoMax: String(maquina.alertas.minutosParadoMax),
    taxaDefeitosMax: String(maquina.alertas.taxaDefeitosMax),
    custoHora: String(maquina.custoHora), valorPorPeca: String(maquina.valorPorPeca),
    turnoInicio: maquina.turnoPlanejado.inicio, turnoFim: maquina.turnoPlanejado.fim,
    potenciaKw: maquina.energia ? String(maquina.energia.potenciaKw) : "",
    potenciaRegeneradaKw: maquina.energia ? String(maquina.energia.potenciaRegeneradaKw) : "0",
    percentualRegeneracao: maquina.energia ? String(maquina.energia.percentualRegeneracao) : "0",
  };
}

// "2,5" e "2.5" valem 2,5; vazio ou texto vira NaN.
const numero = (texto) => (String(texto).trim() === "" ? NaN : Number(String(texto).trim().replace(",", ".")));

function problemaNumerico({ min, max, inteiro }, valor, t) {
  const valido = Number.isFinite(valor) && valor >= min && valor <= max && (!inteiro || Number.isInteger(valor));
  if (valido) return null;
  return t(inteiro ? "machines.validation.integer" : "machines.validation.number", {
    min: inteiro ? min : formatarNumero(min),
    max: inteiro ? max : formatarNumero(max),
  });
}

function validar(campos, valores, t) {
  const problemas = [];
  if (!campos.nome.trim() || !campos.setor.trim() || !campos.linha.trim()) {
    problemas.push(t("machines.validation.required"));
  }
  for (const [nome, definicao] of Object.entries(NUMERICOS)) {
    const problema = problemaNumerico(definicao, valores[nome], t);
    if (problema) problemas.push(`${t(definicao.chaveRotulo)}: ${problema}`);
  }
  if (Number.isFinite(valores.tempMin) && Number.isFinite(valores.tempMax) && valores.tempMin >= valores.tempMax) {
    problemas.push(t("machines.validation.minLessThanMax"));
  }
  if (Number.isFinite(valores.potenciaKw) && Number.isFinite(valores.potenciaRegeneradaKw)
    && valores.potenciaRegeneradaKw > valores.potenciaKw) {
    problemas.push(t("machines.validation.regeneratedPowerLimit"));
  }
  if (campos.turnoInicio === campos.turnoFim) {
    problemas.push(t("machines.validation.differentShiftTimes"));
  }
  return problemas;
}

// Mensagens do backend: a geral e, abaixo, cada campo recusado com o nome usado no formulário.
function problemasDoBackend(erro, t) {
  if (!erro) return [];
  const { mensagem, campos = {} } = erro;
  const porCampo = Object.entries(campos)
    .filter(([, texto]) => texto !== mensagem)
    .map(([campo, texto]) => `${ROTULOS_DA_API[campo] ? t(ROTULOS_DA_API[campo]) : campo}: ${texto}`);
  return [mensagem, ...porCampo];
}

// Cadastro e edição de máquina pelo ENGENHEIRO: identificação, produção, temperatura e
// os limites que transformam um alerta em crítico (chamado automático).
export default function MaquinaForm({ maquina, pendente, erro, onEnviar, onCancelar }) {
  const { t } = useTranslation();
  const [campos, setCampos] = useState(() => camposDe(maquina));
  const [problemasLocais, setProblemasLocais] = useState([]);
  const alterar = (nome) => (e) => setCampos({ ...campos, [nome]: e.target.value });

  const valores = Object.fromEntries(Object.keys(NUMERICOS).map((nome) => [nome, numero(campos[nome])]));
  const { tempMin: min, tempMax: max, percentualCritico: percentual } = valores;
  const previa = Number.isFinite(min) && Number.isFinite(max) && min < max && percentual > 0
    ? faixaCritica({ min, max }, percentual)
    : null;

  const enviar = (evento) => {
    evento.preventDefault();
    const problemas = validar(campos, valores, t);
    setProblemasLocais(problemas);
    if (problemas.length > 0) return;
    onEnviar({
      ...(maquina && { id: maquina.id }),
      nome: campos.nome.trim(), tipo: campos.tipo, setor: campos.setor.trim(), linha: campos.linha.trim(),
      cadenciaIdeal: valores.cadenciaIdeal,
      faixaTemperatura: { min, max },
      alertas: {
        percentualCritico: percentual,
        minutosParadoMax: valores.minutosParadoMax,
        taxaDefeitosMax: valores.taxaDefeitosMax,
      },
      custoHora: valores.custoHora, valorPorPeca: valores.valorPorPeca,
      turnoPlanejado: { inicio: campos.turnoInicio, fim: campos.turnoFim },
      energia: {
        potenciaKw: valores.potenciaKw,
        potenciaRegeneradaKw: valores.potenciaRegeneradaKw,
        percentualRegeneracao: valores.percentualRegeneracao,
      },
    });
  };

  const campo = (id, chaveRotulo, nome, props = {}) => (
    <div className="input-group">
      <label htmlFor={id}>{t(chaveRotulo)}</label>
      <input id={id} value={campos[nome]} onChange={alterar(nome)} {...props} />
    </div>
  );
  // Texto livre: o teclado numérico do iOS (inputMode decimal) não tem sinal de menos.
  const numerico = (id, nome, props = {}) => campo(id, NUMERICOS[nome].chaveRotulo, nome, { autoComplete: "off", ...props });

  const mensagens = problemasLocais.length > 0 ? problemasLocais : problemasDoBackend(erro, t);

  return (
    <section className="card painel-form" aria-labelledby="titulo-form-maquina">
      <h2 id="titulo-form-maquina" className="card-title">
        {maquina ? t("machines.edit", { name: maquina.nome }) : t("machines.new")}
      </h2>
      <form onSubmit={enviar} noValidate>
        {mensagens.length > 0 && (
          <div className="error-message" role="alert">
            {mensagens.length === 1 ? mensagens[0] : (
              <ul className="lista-erros">
                {mensagens.map((texto) => <li key={texto}>{texto}</li>)}
              </ul>
            )}
          </div>
        )}

        <h3 className="form-secao">{t("machines.sections.identification")}</h3>
        <div className="form-colunas">
          {campo("maquina-nome", "machines.fields.name", "nome", { autoFocus: true, maxLength: 60 })}
          <div className="input-group">
            <label htmlFor="maquina-tipo">{t("machines.fields.type")}</label>
            <select id="maquina-tipo" value={campos.tipo} onChange={alterar("tipo")}>
              {Object.entries(TIPOS_DE_MAQUINA).map(([valor, nome]) => (
                <option key={valor} value={valor}>{t(`machines.types.${valor}`, { defaultValue: nome })}</option>
              ))}
            </select>
          </div>
          {campo("maquina-setor", "machines.fields.sector", "setor", { maxLength: 40 })}
          {campo("maquina-linha", "machines.fields.line", "linha", { maxLength: 40 })}
        </div>

        <h3 className="form-secao">{t("machines.sections.production")}</h3>
        <div className="form-colunas">
          {numerico("maquina-cadencia", "cadenciaIdeal", { inputMode: "numeric" })}
          {campo("maquina-turno-inicio", "machines.fields.shiftStart", "turnoInicio", { type: "time" })}
          {campo("maquina-turno-fim", "machines.fields.shiftEnd", "turnoFim", { type: "time" })}
          {numerico("maquina-custo", "custoHora")}
          {numerico("maquina-valor", "valorPorPeca")}
        </div>

        <h3 className="form-secao">{t("machines.sections.temperature")}</h3>
        <div className="form-colunas">
          {numerico("maquina-temp-min", "tempMin")}
          {numerico("maquina-temp-max", "tempMax")}
          {numerico("maquina-percentual", "percentualCritico", { inputMode: "numeric", "aria-describedby": "previa-critico" })}
          {numerico("maquina-parada", "minutosParadoMax", { inputMode: "numeric" })}
          {numerico("maquina-defeitos", "taxaDefeitosMax")}
        </div>
        <p className="form-ajuda" id="previa-critico">
          <strong>
            {previa
              ? t("machines.validation.criticalPreview", { min: formatarNumero(previa.min), max: formatarNumero(previa.max) })
              : t("machines.validation.temperatureRangePrompt")}
          </strong>
          <span> {t("machines.validation.criticalHelp")}</span>
        </p>

        <h3 className="form-secao">{t("machines.sections.energy")}</h3>
        <div className="form-colunas">
          {numerico("maquina-potencia", "potenciaKw")}
          {numerico("maquina-potencia-regenerada", "potenciaRegeneradaKw")}
          {numerico("maquina-regeneracao", "percentualRegeneracao", { inputMode: "numeric" })}
        </div>
        <p className="form-ajuda">
          {t("machines.validation.energyHelp")}
        </p>

        <div className="form-acoes">
          <button type="button" className="btn-secundario" onClick={onCancelar}>{t("machines.form.cancel")}</button>
          <button type="submit" className="btn-primario" disabled={pendente}>
            {pendente ? t("machines.form.saving") : t("machines.form.save")}
          </button>
        </div>
      </form>
    </section>
  );
}
