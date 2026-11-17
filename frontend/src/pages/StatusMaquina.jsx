import CartaoMaquina from "../components/CartaoMaquina";
import GraficoTemperatura from "../components/GraficoTemperatura";
import { SeloSituacao, SeloStatus, Temperatura } from "../components/Selos";
import SeletorMaquina from "../components/SeletorMaquina";
import SobreEstesDados from "../components/SobreEstesDados";
import { mensagemDeErro } from "../services/api";
import { formatarMinutos, tempoDesde, useAgora, useLeituras, useRelogio } from "../services/indicadores";
import { formatarNumero, textoFaixa, useMaquinaSelecionada } from "../services/maquinas";

// Aviso quando a temperatura sai da faixa (alerta) ou passa do limite crítico. O texto só muda
// quando a situação muda (o valor fica no cartão de temperatura), para o leitor de tela não
// repetir o aviso a cada atualização de 10 s.
function avisoDeTemperatura(maquina, leitura) {
  if (!leitura) return null;
  const { limiteCritico: critico } = maquina;
  if (leitura.situacaoTemperatura === "CRITICO") {
    const lado = leitura.temperatura > critico.max
      ? `acima de ${formatarNumero(critico.max)} °C`
      : `abaixo de ${formatarNumero(critico.min)} °C`;
    return `Temperatura além do limite crítico (crítico ${lado}).`;
  }
  if (leitura.situacaoTemperatura === "ALERTA") {
    return `Temperatura fora da faixa permitida (${textoFaixa(maquina.faixaTemperatura)}).`;
  }
  return null;
}

function SituacaoAtual({ maquina, agora }) {
  const relogio = useRelogio();
  const { ultimaLeitura: leitura, ultimaHora, turno } = agora;
  const defeituosas = ultimaHora.totais.pecasProduzidas - ultimaHora.totais.pecasBoas;
  return (
    <section className="stats-row" aria-label={`Situação atual de ${maquina.nome}`}>
      <div className="stat-card">
        <span className="stat-label">Status atual</span>
        <span className="stat-value"><SeloStatus status={leitura?.status} /></span>
        <span className="stat-detalhe">{tempoDesde(leitura?.instante, relogio)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Temperatura</span>
        <span className="stat-value"><Temperatura valor={leitura?.temperatura} /></span>
        <span className="stat-detalhe"><SeloSituacao situacao={leitura?.situacaoTemperatura} /></span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Peças na última hora</span>
        <span className="stat-value">{ultimaHora.totais.pecasProduzidas.toLocaleString("pt-BR")}</span>
        <span className="stat-detalhe">
          {`${ultimaHora.totais.pecasBoas.toLocaleString("pt-BR")} boas · ${defeituosas.toLocaleString("pt-BR")} defeituosas`}
        </span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Paradas no turno{turno.emAndamento ? "" : " (encerrado)"}</span>
        <span className="stat-value">{turno.totais.paradas}</span>
        <span className="stat-detalhe">
          {`parado ${formatarMinutos(turno.indicadores.downtimeMinutos)} · MTBF ${formatarMinutos(turno.indicadores.mtbfMinutos)}`}
        </span>
      </div>
    </section>
  );
}

function StatusDaMaquina({ maquina }) {
  const agora = useAgora(maquina.id);
  const leituras = useLeituras(maquina.id, 120);
  if (agora.isPending) return <p className="tabela-vazia">Carregando indicadores...</p>;
  if (agora.isError) return <div className="error-message" role="alert">{mensagemDeErro(agora.error)}</div>;

  const aviso = avisoDeTemperatura(maquina, agora.data.ultimaLeitura);
  return (
    <>
      {aviso && (
        <div role="status" className={`aviso-temperatura aviso-${agora.data.ultimaLeitura.situacaoTemperatura.toLowerCase()}`}>
          {aviso}
        </div>
      )}
      <SituacaoAtual maquina={maquina} agora={agora.data} />
      <section className="card" aria-labelledby="titulo-grafico-temperatura">
        <h2 id="titulo-grafico-temperatura" className="card-title">Temperatura nas últimas 2 h</h2>
        {leituras.isPending && <p className="tabela-vazia">Carregando leituras...</p>}
        {leituras.isError && <p className="tabela-vazia">{mensagemDeErro(leituras.error)}</p>}
        {leituras.isSuccess && <GraficoTemperatura maquina={maquina} pontos={leituras.data} />}
      </section>
      <SobreEstesDados maquina={maquina.nome} ultimaLeitura={agora.data.ultimaLeitura}
        frequenciaSegundos={agora.data.frequenciaSegundos} formulas={["downtime", "mtbf", "limiteCritico"]} />
    </>
  );
}

// Situação da máquina escolhida agora: status, temperatura × faixa, peças, paradas e o
// gráfico das últimas 2 h. Atualiza sozinha a cada 10 s.
export default function StatusMaquina() {
  const selecao = useMaquinaSelecionada();
  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">Status da Máquina</h1>
          <p className="page-greeting">Monitoramento em tempo real</p>
        </div>
        <SeletorMaquina selecao={selecao} />
      </div>
      <CartaoMaquina maquina={selecao.maquina} />
      {selecao.maquina && <StatusDaMaquina key={selecao.maquina.id} maquina={selecao.maquina} />}
    </>
  );
}
