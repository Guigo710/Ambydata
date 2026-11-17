import { useState } from "react";
import { TIPOS_DE_MAQUINA, faixaCritica, formatarNumero } from "../services/maquinas";

// Campos numéricos: rótulo, caminho no JSON da API e limites (os mesmos do backend).
// Validar aqui evita mandar null (Number("") vira NaN, que o JSON transforma em null).
const NUMERICOS = {
  cadenciaIdeal: { rotulo: "Cadência ideal (peças/min)", api: "cadenciaIdeal", min: 1, max: 10000, inteiro: true },
  custoHora: { rotulo: "Custo por hora (R$)", api: "custoHora", min: 0, max: 1000000 },
  valorPorPeca: { rotulo: "Valor por peça (R$)", api: "valorPorPeca", min: 0, max: 1000000 },
  tempMin: { rotulo: "Temperatura mínima (°C)", api: "faixaTemperatura.min", min: -100, max: 1000 },
  tempMax: { rotulo: "Temperatura máxima (°C)", api: "faixaTemperatura.max", min: -100, max: 1000 },
  percentualCritico: { rotulo: "Crítico além da faixa (%)", api: "alertas.percentualCritico", min: 1, max: 500, inteiro: true },
  minutosParadoMax: { rotulo: "Parada crítica após (min)", api: "alertas.minutosParadoMax", min: 1, max: 480, inteiro: true },
  taxaDefeitosMax: { rotulo: "Defeitos críticos acima de (%)", api: "alertas.taxaDefeitosMax", min: 0.1, max: 100 },
  potenciaKw: { rotulo: "Potência ativa (kW)", api: "energia.potenciaKw", min: 0.1, max: 10000 },
  potenciaRegeneradaKw: { rotulo: "Potência regenerada (kW)", api: "energia.potenciaRegeneradaKw", min: 0, max: 10000 },
  percentualRegeneracao: { rotulo: "Regeneração (% do tempo operando)", api: "energia.percentualRegeneracao", min: 0, max: 100, inteiro: true },
};

// Rótulo de cada campo que o backend pode recusar (chave de `campos` na resposta de erro).
const ROTULOS_DA_API = {
  nome: "Nome", tipo: "Tipo", setor: "Setor", linha: "Linha",
  faixaTemperatura: "Faixa de temperatura", energia: "Energia",
  turnoPlanejado: "Turno", "turnoPlanejado.inicio": "Início do turno", "turnoPlanejado.fim": "Fim do turno",
  ...Object.fromEntries(Object.values(NUMERICOS).map((c) => [c.api, c.rotulo])),
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

function problemaNumerico({ min, max, inteiro }, valor) {
  const valido = Number.isFinite(valor) && valor >= min && valor <= max && (!inteiro || Number.isInteger(valor));
  if (valido) return null;
  return inteiro
    ? `informe um número inteiro de ${min} a ${max}.`
    : `informe um número de ${formatarNumero(min)} a ${formatarNumero(max)}.`;
}

function validar(campos, valores) {
  const problemas = [];
  if (!campos.nome.trim() || !campos.setor.trim() || !campos.linha.trim()) {
    problemas.push("Preencha nome, setor e linha.");
  }
  for (const [nome, definicao] of Object.entries(NUMERICOS)) {
    const problema = problemaNumerico(definicao, valores[nome]);
    if (problema) problemas.push(`${definicao.rotulo}: ${problema}`);
  }
  if (Number.isFinite(valores.tempMin) && Number.isFinite(valores.tempMax) && valores.tempMin >= valores.tempMax) {
    problemas.push("A temperatura mínima precisa ser menor que a máxima.");
  }
  if (Number.isFinite(valores.potenciaKw) && Number.isFinite(valores.potenciaRegeneradaKw)
    && valores.potenciaRegeneradaKw > valores.potenciaKw) {
    problemas.push("A potência regenerada não pode passar da potência ativa.");
  }
  if (campos.turnoInicio === campos.turnoFim) {
    problemas.push("O início e o fim do turno precisam ser diferentes.");
  }
  return problemas;
}

// Mensagens do backend: a geral e, abaixo, cada campo recusado com o nome usado no formulário.
function problemasDoBackend(erro) {
  if (!erro) return [];
  const { mensagem, campos = {} } = erro;
  const porCampo = Object.entries(campos)
    .filter(([, texto]) => texto !== mensagem)
    .map(([campo, texto]) => `${ROTULOS_DA_API[campo] ?? campo}: ${texto}`);
  return [mensagem, ...porCampo];
}

// Cadastro e edição de máquina pelo ENGENHEIRO: identificação, produção, temperatura e
// os limites que transformam um alerta em crítico (chamado automático).
export default function MaquinaForm({ maquina, pendente, erro, onEnviar, onCancelar }) {
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
    const problemas = validar(campos, valores);
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

  const campo = (id, rotulo, nome, props = {}) => (
    <div className="input-group">
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} value={campos[nome]} onChange={alterar(nome)} {...props} />
    </div>
  );
  // Texto livre: o teclado numérico do iOS (inputMode decimal) não tem sinal de menos.
  const numerico = (id, nome, props = {}) => campo(id, NUMERICOS[nome].rotulo, nome, { autoComplete: "off", ...props });

  const mensagens = problemasLocais.length > 0 ? problemasLocais : problemasDoBackend(erro);

  return (
    <section className="card painel-form" aria-labelledby="titulo-form-maquina">
      <h2 id="titulo-form-maquina" className="card-title">{maquina ? `Editar ${maquina.nome}` : "Nova máquina"}</h2>
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

        <h3 className="form-secao">Identificação</h3>
        <div className="form-colunas">
          {campo("maquina-nome", "Nome", "nome", { autoFocus: true, maxLength: 60 })}
          <div className="input-group">
            <label htmlFor="maquina-tipo">Tipo</label>
            <select id="maquina-tipo" value={campos.tipo} onChange={alterar("tipo")}>
              {Object.entries(TIPOS_DE_MAQUINA).map(([valor, nome]) => (
                <option key={valor} value={valor}>{nome}</option>
              ))}
            </select>
          </div>
          {campo("maquina-setor", "Setor", "setor", { maxLength: 40 })}
          {campo("maquina-linha", "Linha", "linha", { maxLength: 40 })}
        </div>

        <h3 className="form-secao">Produção</h3>
        <div className="form-colunas">
          {numerico("maquina-cadencia", "cadenciaIdeal", { inputMode: "numeric" })}
          {campo("maquina-turno-inicio", "Início do turno", "turnoInicio", { type: "time" })}
          {campo("maquina-turno-fim", "Fim do turno", "turnoFim", { type: "time" })}
          {numerico("maquina-custo", "custoHora")}
          {numerico("maquina-valor", "valorPorPeca")}
        </div>

        <h3 className="form-secao">Temperatura e alertas</h3>
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
              ? `Crítico abaixo de ${formatarNumero(previa.min)} °C ou acima de ${formatarNumero(previa.max)} °C`
              : "Informe a faixa de temperatura para ver o limite crítico."}
          </strong>
          <span> Fora da faixa é alerta; além do limite crítico, a máquina abre um chamado sozinha.</span>
        </p>

        <h3 className="form-secao">Energia</h3>
        <div className="form-colunas">
          {numerico("maquina-potencia", "potenciaKw")}
          {numerico("maquina-potencia-regenerada", "potenciaRegeneradaKw")}
          {numerico("maquina-regeneracao", "percentualRegeneracao", { inputMode: "numeric" })}
        </div>
        <p className="form-ajuda">
          Consumo = potência ativa × tempo operando. Com frenagem regenerativa, a máquina devolve à rede a
          potência regenerada durante o percentual do tempo operando informado (0 = não regenera).
        </p>

        <div className="form-acoes">
          <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
          <button type="submit" className="btn-primario" disabled={pendente}>{pendente ? "Salvando..." : "Salvar"}</button>
        </div>
      </form>
    </section>
  );
}
