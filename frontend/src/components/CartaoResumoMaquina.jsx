import { percentual } from "../services/indicadores";
import { textoFaixa } from "../services/maquinas";
import { SeloSituacao, SeloStatus, Temperatura } from "./Selos";

// Card de uma máquina no Painel ("Todas as máquinas"): status, temperatura × faixa e OEE
// da última hora. "Ver" mostra o resumo dela no próprio Painel.
export default function CartaoResumoMaquina({ resumo, onVer }) {
  const { maquina, ultimaLeitura, ultimaHora } = resumo;
  const situacao = ultimaLeitura?.situacaoTemperatura;
  return (
    <article className={`card cartao-resumo ${situacao ? `borda-${situacao.toLowerCase()}` : ""}`} aria-label={maquina.nome}>
      <header className="cartao-resumo-topo">
        <div>
          <h3 className="cartao-resumo-nome">{maquina.nome}</h3>
          <p className="cartao-resumo-setor">{maquina.setor}</p>
        </div>
        <SeloStatus status={ultimaLeitura?.status} />
      </header>
      <dl className="cartao-resumo-dados">
        <div>
          <dt>Temperatura</dt>
          <dd className="cartao-resumo-temperatura">
            <Temperatura valor={ultimaLeitura?.temperatura} /> <SeloSituacao situacao={situacao} />
          </dd>
          <dd className="cartao-resumo-faixa">faixa {textoFaixa(maquina.faixaTemperatura)}</dd>
        </div>
        <div>
          <dt>OEE (última hora)</dt>
          <dd className="cartao-resumo-oee">{percentual(ultimaHora?.indicadores?.oee)}</dd>
        </div>
      </dl>
      <button type="button" className="btn-link cartao-resumo-ver" aria-label={`Ver ${maquina.nome}`} onClick={() => onVer(maquina.id)}>
        Ver máquina
      </button>
    </article>
  );
}
