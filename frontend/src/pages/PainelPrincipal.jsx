import { Link } from "react-router-dom";
import { useAuth } from "../auth/contexto";
import CartaoMaquina from "../components/CartaoMaquina";
import CartaoResumoMaquina from "../components/CartaoResumoMaquina";
import { SeloSituacao, SeloStatus, Temperatura } from "../components/Selos";
import SeletorMaquina from "../components/SeletorMaquina";
import SobreEstesDados from "../components/SobreEstesDados";
import { mensagemDeErro } from "../services/api";
import { percentual, tempoDesde, useAgora, useResumo } from "../services/indicadores";
import { porLinha, textoFaixa, useMaquinaSelecionada } from "../services/maquinas";

// "1 operando · 1 parada · 1 com temperatura crítica" (só o que existe na hora).
function resumoDaFabrica(resumos) {
  const contar = (filtro) => resumos.filter(filtro).length;
  const operando = contar((r) => r.ultimaLeitura?.status === "OPERANDO");
  const paradas = contar((r) => r.ultimaLeitura?.status === "PARADA");
  const fora = contar((r) => r.ultimaLeitura?.status === "FORA_DO_TURNO");
  const semLeitura = contar((r) => !r.ultimaLeitura);
  const criticas = contar((r) => r.ultimaLeitura?.situacaoTemperatura === "CRITICO");
  const partes = [`${operando} operando`, `${paradas} ${paradas === 1 ? "parada" : "paradas"}`];
  if (fora) partes.push(`${fora} fora do turno`);
  if (semLeitura) partes.push(`${semLeitura} sem leitura`);
  if (criticas) partes.push(`${criticas} com temperatura crítica`);
  return partes.join(" · ");
}

// A leitura mais recente entre todas as máquinas, e a fonte (as duas, se misturadas).
function leituraMaisRecente(resumos) {
  const leituras = resumos.map((r) => r.ultimaLeitura).filter(Boolean);
  if (leituras.length === 0) return null;
  const maisRecente = leituras.reduce((a, b) => (new Date(a.instante) > new Date(b.instante) ? a : b));
  const origens = new Set(leituras.map((l) => l.origem));
  return { ...maisRecente, origem: origens.size > 1 ? "Simulador e dispositivo" : maisRecente.origem };
}

function TodasAsMaquinas({ onVer }) {
  const resumo = useResumo();
  if (resumo.isPending) return <p className="tabela-vazia">Carregando máquinas...</p>;
  if (resumo.isError) return <div className="error-message" role="alert">{mensagemDeErro(resumo.error)}</div>;

  const resumos = resumo.data;
  const porMaquina = new Map(resumos.map((r) => [r.maquina.id, r]));
  return (
    <>
      <p className="resumo-fabrica" role="status">{resumoDaFabrica(resumos)}</p>
      {porLinha(resumos.map((r) => r.maquina)).map(([linha, maquinas]) => (
        <section key={linha} className="grupo-linha" aria-label={linha}>
          <h2 className="grupo-linha-titulo">{linha}</h2>
          <div className="grade-cartoes">
            {maquinas.map((m) => <CartaoResumoMaquina key={m.id} resumo={porMaquina.get(m.id)} onVer={onVer} />)}
          </div>
        </section>
      ))}
      <SobreEstesDados maquina={`Todas as máquinas (${resumos.length})`} ultimaLeitura={leituraMaisRecente(resumos)}
        formulas={["oee", "disponibilidade", "performance", "qualidade"]} />
    </>
  );
}

function ResumoDeUmaMaquina({ maquina }) {
  const agora = useAgora(maquina.id);
  return (
    <>
      <CartaoMaquina maquina={maquina} />
      {agora.isPending && <p className="tabela-vazia">Carregando indicadores...</p>}
      {agora.isError && <div className="error-message" role="alert">{mensagemDeErro(agora.error)}</div>}
      {agora.isSuccess && (
        <>
          <section className="stats-row" aria-label={`Resumo de ${maquina.nome}`}>
            <div className="stat-card">
              <span className="stat-label">Status atual</span>
              <span className="stat-value"><SeloStatus status={agora.data.ultimaLeitura?.status} /></span>
              <span className="stat-detalhe">{tempoDesde(agora.data.ultimaLeitura?.instante)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Temperatura</span>
              <span className="stat-value"><Temperatura valor={agora.data.ultimaLeitura?.temperatura} /></span>
              <span className="stat-detalhe">
                <SeloSituacao situacao={agora.data.ultimaLeitura?.situacaoTemperatura} /> faixa {textoFaixa(maquina.faixaTemperatura)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">OEE da última hora</span>
              <span className="stat-value">{percentual(agora.data.ultimaHora.indicadores.oee)}</span>
              <span className="stat-detalhe">turno: {percentual(agora.data.turno.indicadores.oee)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Peças na última hora</span>
              <span className="stat-value">{agora.data.ultimaHora.totais.pecasProduzidas.toLocaleString("pt-BR")}</span>
              <span className="stat-detalhe">{agora.data.ultimaHora.totais.pecasBoas.toLocaleString("pt-BR")} boas</span>
            </div>
          </section>
          <Link className="btn-link" to={`/status-maquina?maquina=${encodeURIComponent(maquina.id)}`}>Ver no Status da Máquina</Link>
          <SobreEstesDados maquina={maquina.nome} ultimaLeitura={agora.data.ultimaLeitura}
            frequenciaSegundos={agora.data.frequenciaSegundos} formulas={["oee", "disponibilidade", "performance", "qualidade"]} />
        </>
      )}
    </>
  );
}

// Visão geral da fábrica ("Todas as máquinas") ou o resumo da máquina escolhida no seletor.
export default function PainelPrincipal() {
  const { usuario } = useAuth();
  const selecao = useMaquinaSelecionada({ permitirTodas: true });

  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">Painel Principal</h1>
          <p className="page-greeting">Olá {usuario?.nome || "Usuário"}</p>
        </div>
        <SeletorMaquina selecao={selecao} permitirTodas />
      </div>
      {selecao.maquina
        ? <ResumoDeUmaMaquina key={selecao.maquina.id} maquina={selecao.maquina} />
        : <TodasAsMaquinas onVer={selecao.escolher} />}
    </>
  );
}
