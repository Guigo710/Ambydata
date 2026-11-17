import { TIPOS_DE_MAQUINA, formatarNumero, textoFaixa } from "../services/maquinas";

// Identificação da máquina selecionada: o que é, onde fica e quais limites valem para ela.
export default function CartaoMaquina({ maquina }) {
  if (!maquina) return null;
  const { limiteCritico, alertas } = maquina;
  return (
    <section className="card cartao-maquina" aria-label={`Máquina ${maquina.nome}`}>
      <div>
        <p className="cartao-maquina-nome">{maquina.nome}</p>
        <p className="cartao-maquina-local">{maquina.setor} · {maquina.linha}</p>
      </div>
      <dl className="cartao-maquina-dados">
        <div><dt>Tipo</dt><dd>{TIPOS_DE_MAQUINA[maquina.tipo] ?? maquina.tipo}</dd></div>
        <div><dt>Cadência ideal</dt><dd>{maquina.cadenciaIdeal} peças/min</dd></div>
        <div><dt>Turno</dt><dd>{maquina.turnoPlanejado.inicio} às {maquina.turnoPlanejado.fim}</dd></div>
        <div><dt>Faixa permitida</dt><dd>{textoFaixa(maquina.faixaTemperatura)}</dd></div>
        <div>
          <dt>Crítico</dt>
          <dd>{`abaixo de ${formatarNumero(limiteCritico.min)} °C ou acima de ${formatarNumero(limiteCritico.max)} °C (${alertas.percentualCritico}% da faixa)`}</dd>
        </div>
      </dl>
    </section>
  );
}
