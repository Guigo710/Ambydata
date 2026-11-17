import { useState } from "react";
import { useAuth } from "../auth/contexto";
import SeletorOpcoes from "../components/SeletorOpcoes";
import SobreEstesDados from "../components/SobreEstesDados";
import TarifasEnergia from "../components/TarifasEnergia";
import { mensagemDeErro } from "../services/api";
import { dinheiro, horas, kw, kwh, tarifa, textoPeriodo, useEnergia } from "../services/indicadores";

function Cartao({ titulo, valor, detalhe, destaque = false }) {
  return (
    <div className={`stat-card ${destaque ? "stat-destaque" : ""}`}>
      <span className="stat-label">{titulo}</span>
      <span className="stat-value">{valor}</span>
      {detalhe && <span className="stat-detalhe">{detalhe}</span>}
    </div>
  );
}

function LinhaMaquina({ maquina }) {
  const b = maquina.balanco;
  const nome = (
    <th scope="row">
      {maquina.nome}
      <span className="tabela-detalhe">{`${maquina.setor} · ${maquina.linha}`}</span>
    </th>
  );
  if (maquina.semParametros) {
    return (
      <tr>
        {nome}
        <td colSpan={5} className="tabela-aviso">Potência não cadastrada</td>
      </tr>
    );
  }
  const regenera = b.potenciaRegeneradaKw > 0 && b.horasRegeneracao > 0;
  return (
    <tr>
      {nome}
      <td>{`${kw(b.potenciaKw)} × ${horas(b.horasOperando)} = ${kwh(b.consumoKwh)}`}</td>
      <td>{dinheiro(b.custoEntrada)}</td>
      <td>{regenera ? `${kw(b.potenciaRegeneradaKw)} × ${horas(b.horasRegeneracao)} = ${kwh(b.energiaInjetadaKwh)}` : "não regenera"}</td>
      <td>{regenera ? dinheiro(b.valorInjetado) : "—"}</td>
      <td className="valor-destaque">{dinheiro(b.custoLiquido)}</td>
    </tr>
  );
}

// Custo de energia (ENGENHEIRO e DIRETOR): balanço de cada máquina, das linhas e da fábrica,
// com as tarifas usadas. Informativo: não entra no lucro de Custos e Lucros.
export default function Energia() {
  const { perfil } = useAuth();
  const [periodo, setPeriodo] = useState("24h");
  const energia = useEnergia(periodo);
  const dados = energia.data;

  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">Energia</h1>
          <p className="page-greeting">Consumo, energia devolvida à rede e custo líquido</p>
        </div>
        <SeletorOpcoes legenda="Período" nome="periodo-energia" opcoes={[["24h", "24 horas"], ["7d", "7 dias"]]}
          valor={periodo} onChange={setPeriodo} />
      </div>

      {energia.isPending && <p className="tabela-vazia">Carregando energia...</p>}
      {energia.isError && <div className="error-message" role="alert">{mensagemDeErro(energia.error)}</div>}
      {energia.isSuccess && (
        <>
          <section className="stats-row stats-row-5" aria-label="Total da fábrica">
            <Cartao titulo="Consumo" valor={kwh(dados.total.maquinas.consumoKwh)} detalhe="todas as máquinas" />
            <Cartao titulo="Custo de entrada" valor={dinheiro(dados.total.maquinas.custoEntrada)}
              detalhe={`consumo × ${tarifa(dados.tarifas.tarifaCheia)}/kWh`} />
            <Cartao titulo="Crédito da energia injetada" valor={dinheiro(dados.total.maquinas.valorInjetado)}
              detalhe={`${kwh(dados.total.maquinas.energiaInjetadaKwh)} × ${tarifa(dados.tarifas.tarifaCompensavel)}/kWh`} />
            <Cartao titulo="Encargos/demanda" valor={dinheiro(dados.total.encargosDemanda)}
              detalhe={`${kw(dados.tarifas.demandaContratadaKw)} × ${dinheiro(dados.tarifas.tarifaDemanda)} × ${horas(dados.total.horasPeriodo)} ÷ 720`} />
            <Cartao titulo="Custo líquido" valor={dinheiro(dados.total.custoLiquido)} detalhe="entrada − crédito + encargos" destaque />
          </section>
          <p className="stat-detalhe">Informativo: o custo de energia não entra no lucro de Custos e Lucros.</p>

          <section className="card espaco-acima">
            <h2 className="card-title">Por máquina</h2>
            <div className="tabela-rolagem">
              <table className="tabela" aria-label="Por máquina">
                <thead>
                  <tr>
                    <th scope="col">Máquina</th><th scope="col">Consumo</th><th scope="col">Custo de entrada</th>
                    <th scope="col">Energia injetada</th><th scope="col">Crédito</th><th scope="col">Custo líquido</th>
                  </tr>
                </thead>
                <tbody>{dados.maquinas.map((m) => <LinhaMaquina key={m.id} maquina={m} />)}</tbody>
              </table>
            </div>
          </section>

          <section className="card espaco-acima">
            <h2 className="card-title">Por linha</h2>
            <table className="tabela" aria-label="Por linha">
              <thead>
                <tr>
                  <th scope="col">Linha</th><th scope="col">Consumo</th><th scope="col">Custo de entrada</th>
                  <th scope="col">Crédito</th><th scope="col">Custo líquido</th>
                </tr>
              </thead>
              <tbody>
                {dados.linhas.map((l) => (
                  <tr key={l.linha}>
                    <th scope="row">{l.linha}</th>
                    <td>{kwh(l.soma.consumoKwh)}</td>
                    <td>{dinheiro(l.soma.custoEntrada)}</td>
                    <td>{dinheiro(l.soma.valorInjetado)}</td>
                    <td className="valor-destaque">{dinheiro(l.soma.custoLiquido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="stat-detalhe">Os encargos de demanda entram só no total da fábrica, que é quem contrata a demanda.</p>
          </section>

          <TarifasEnergia tarifas={dados.tarifas} podeEditar={perfil === "ENGENHEIRO"} />

          <SobreEstesDados maquina={`Todas as máquinas (${dados.maquinas.length})`}
            fonte="Tempo operando dos agregados por hora × potência da máquina" frequencia="a cada hora fechada"
            periodo={textoPeriodo(dados.inicio, dados.fim)}
            formulas={["consumo", "custoEntrada", "energiaInjetada", "valorInjetado", "encargos", "custoLiquido"]} />
        </>
      )}
    </>
  );
}
