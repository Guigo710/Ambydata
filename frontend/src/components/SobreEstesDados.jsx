import { FORMULAS, NOME_DA_ORIGEM, tempoDesde, useRelogio } from "../services/indicadores";

// De onde vem o que a tela mostra: máquina, fonte, frequência, última leitura e, ao abrir,
// as fórmulas usadas (SPEC-indicadores: o usuário precisa saber o que está vendo).
// `agora` fixo só nos testes; na tela, o relógio anda a cada segundo.
export default function SobreEstesDados({ maquina, ultimaLeitura, frequenciaSegundos = 10, formulas = [], agora }) {
  const relogio = useRelogio();
  const fonte = ultimaLeitura ? NOME_DA_ORIGEM[ultimaLeitura.origem] ?? ultimaLeitura.origem : "—";
  return (
    <section className="card sobre-dados" aria-label="Sobre estes dados">
      <h2 className="sobre-dados-titulo">Sobre estes dados</h2>
      <dl className="sobre-dados-lista">
        <div><dt>Máquina</dt><dd>{maquina}</dd></div>
        <div><dt>Fonte</dt><dd>{fonte}</dd></div>
        <div><dt>Frequência</dt><dd>a cada {frequenciaSegundos} s</dd></div>
        <div><dt>Última leitura</dt><dd>{tempoDesde(ultimaLeitura?.instante, agora ?? relogio)}</dd></div>
      </dl>
      {formulas.length > 0 && (
        <details className="sobre-dados-formulas">
          <summary>Como é calculado</summary>
          <ul>
            {formulas.map((chave) => <li key={chave}>{FORMULAS[chave]}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}
