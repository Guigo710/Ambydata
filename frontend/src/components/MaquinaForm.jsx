import { useState } from "react";
import { TIPOS_DE_MAQUINA, faixaCritica, formatarNumero } from "../services/maquinas";


const PADRAO = {
  nome: "", tipo: "OUTRA", setor: "", linha: "", cadenciaIdeal: "60",
  tempMin: "", tempMax: "", percentualCritico: "50", minutosParadoMax: "15", taxaDefeitosMax: "8",
  custoHora: "100", valorPorPeca: "2", turnoInicio: "06:00", turnoFim: "22:00",
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
  };
}

const numero = (texto) => (texto === "" ? NaN : Number(String(texto).replace(",", ".")));

// Cadastro e edição de máquina pelo ENGENHEIRO: identificação, produção, temperatura e
// os limites que transformam um alerta em crítico (chamado automático).
export default function MaquinaForm({ maquina, pendente, erro, onEnviar, onCancelar }) {
  const [campos, setCampos] = useState(() => camposDe(maquina));
  const [erroLocal, setErroLocal] = useState(null);
  const alterar = (nome) => (e) => setCampos({ ...campos, [nome]: e.target.value });

  const min = numero(campos.tempMin);
  const max = numero(campos.tempMax);
  const percentual = numero(campos.percentualCritico);
  const previa = !Number.isNaN(min) && !Number.isNaN(max) && min < max && percentual > 0
    ? faixaCritica({ min, max }, percentual)
    : null;

  const enviar = (evento) => {
    evento.preventDefault();
    if (!campos.nome.trim() || !campos.setor.trim() || !campos.linha.trim()) {
      setErroLocal("Preencha nome, setor e linha.");
      return;
    }
    if (Number.isNaN(min) || Number.isNaN(max) || min >= max) {
      setErroLocal("A temperatura mínima precisa ser menor que a máxima.");
      return;
    }
    if (!(percentual >= 1 && percentual <= 500)) {
      setErroLocal("O percentual crítico precisa estar entre 1% e 500%.");
      return;
    }
    setErroLocal(null);
    onEnviar({
      ...(maquina && { id: maquina.id }),
      nome: campos.nome.trim(), tipo: campos.tipo, setor: campos.setor.trim(), linha: campos.linha.trim(),
      cadenciaIdeal: numero(campos.cadenciaIdeal),
      faixaTemperatura: { min, max },
      alertas: {
        percentualCritico: percentual,
        minutosParadoMax: numero(campos.minutosParadoMax),
        taxaDefeitosMax: numero(campos.taxaDefeitosMax),
      },
      custoHora: numero(campos.custoHora), valorPorPeca: numero(campos.valorPorPeca),
      turnoPlanejado: { inicio: campos.turnoInicio, fim: campos.turnoFim },
    });
  };

  const campo = (id, rotulo, nome, props = {}) => (
    <div className="input-group">
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} value={campos[nome]} onChange={alterar(nome)} {...props} />
    </div>
  );

  const mensagem = erroLocal ?? erro;

  return (
    <section className="card painel-form" aria-labelledby="titulo-form-maquina">
      <h2 id="titulo-form-maquina" className="card-title">{maquina ? `Editar ${maquina.nome}` : "Nova máquina"}</h2>
      <form onSubmit={enviar} noValidate>
        {mensagem && <div className="error-message" role="alert">{mensagem}</div>}

        <h3 className="form-secao">Identificação</h3>
        <div className="form-colunas">
          {campo("maquina-nome", "Nome", "nome")}
          <div className="input-group">
            <label htmlFor="maquina-tipo">Tipo</label>
            <select id="maquina-tipo" value={campos.tipo} onChange={alterar("tipo")}>
              {Object.entries(TIPOS_DE_MAQUINA).map(([valor, nome]) => (
                <option key={valor} value={valor}>{nome}</option>
              ))}
            </select>
          </div>
          {campo("maquina-setor", "Setor", "setor")}
          {campo("maquina-linha", "Linha", "linha")}
        </div>

        <h3 className="form-secao">Produção</h3>
        <div className="form-colunas">
          {campo("maquina-cadencia", "Cadência ideal (peças/min)", "cadenciaIdeal", { inputMode: "numeric" })}
          {campo("maquina-turno-inicio", "Início do turno", "turnoInicio", { type: "time" })}
          {campo("maquina-turno-fim", "Fim do turno", "turnoFim", { type: "time" })}
          {campo("maquina-custo", "Custo por hora (R$)", "custoHora", { inputMode: "decimal" })}
          {campo("maquina-valor", "Valor por peça (R$)", "valorPorPeca", { inputMode: "decimal" })}
        </div>

        <h3 className="form-secao">Temperatura e alertas</h3>
        <div className="form-colunas">
          {campo("maquina-temp-min", "Temperatura mínima (°C)", "tempMin", { inputMode: "decimal" })}
          {campo("maquina-temp-max", "Temperatura máxima (°C)", "tempMax", { inputMode: "decimal" })}
          {campo("maquina-percentual", "Crítico além da faixa (%)", "percentualCritico", { inputMode: "numeric" })}
          {campo("maquina-parada", "Parada crítica após (min)", "minutosParadoMax", { inputMode: "numeric" })}
          {campo("maquina-defeitos", "Defeitos críticos acima de (%)", "taxaDefeitosMax", { inputMode: "decimal" })}
        </div>
        <p className="form-ajuda" aria-live="polite">
          <strong>
            {previa
              ? `Crítico abaixo de ${formatarNumero(previa.min)} °C ou acima de ${formatarNumero(previa.max)} °C`
              : "Informe a faixa de temperatura para ver o limite crítico."}
          </strong>
          <span> Fora da faixa é alerta; além do limite crítico, a máquina abre um chamado sozinha.</span>
        </p>

        <div className="form-acoes">
          <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
          <button type="submit" className="btn-primario" disabled={pendente}>{pendente ? "Salvando..." : "Salvar"}</button>
        </div>
      </form>
    </section>
  );
}
