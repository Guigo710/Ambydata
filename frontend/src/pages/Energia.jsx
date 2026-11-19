import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        <td colSpan={5} className="tabela-aviso">{t("pages.energy.missingPower")}</td>
      </tr>
    );
  }
  const regenera = b.potenciaRegeneradaKw > 0 && b.horasRegeneracao > 0;
  return (
    <tr>
      {nome}
      <td>{`${kw(b.potenciaKw)} × ${horas(b.horasOperando)} = ${kwh(b.consumoKwh)}`}</td>
      <td>{dinheiro(b.custoEntrada)}</td>
      <td>{regenera ? `${kw(b.potenciaRegeneradaKw)} × ${horas(b.horasRegeneracao)} = ${kwh(b.energiaInjetadaKwh)}` : t("pages.energy.noRegeneration")}</td>
      <td>{regenera ? dinheiro(b.valorInjetado) : "—"}</td>
      <td className="valor-destaque">{dinheiro(b.custoLiquido)}</td>
    </tr>
  );
}

// Custo de energia (ENGENHEIRO e DIRETOR): balanço de cada máquina, das linhas e da fábrica,
// com as tarifas usadas. Informativo: não entra no lucro de Custos e Lucros.
export default function Energia() {
  const { t } = useTranslation();
  const { perfil } = useAuth();
  const [periodo, setPeriodo] = useState("24h");
  const energia = useEnergia(periodo);
  const dados = energia.data;

  return (
    <>
      <div className="page-header cabecalho-com-seletor">
        <div>
          <h1 className="page-title">{t("pages.energy.title")}</h1>
          <p className="page-greeting">{t("pages.energy.subtitle")}</p>
        </div>
        <SeletorOpcoes legenda="common.period" nome="periodo-energia" opcoes={[["24h", "filters.24hours"], ["7d", "filters.7days"]]}
          valor={periodo} onChange={setPeriodo} />
      </div>

      {energia.isPending && <p className="tabela-vazia">{t("pages.energy.loading")}</p>}
      {energia.isError && <div className="error-message" role="alert">{mensagemDeErro(energia.error)}</div>}
      {energia.isSuccess && (
        <>
          <section className="stats-row stats-row-5" aria-label={t("common.totalFactory")}>
            <Cartao titulo={t("common.consumption")} valor={kwh(dados.total.maquinas.consumoKwh)} detalhe={t("pages.energy.allMachines")} />
            <Cartao titulo={t("common.inputCost")} valor={dinheiro(dados.total.maquinas.custoEntrada)}
              detalhe={t("pages.energy.inputDetail", { rate: tarifa(dados.tarifas.tarifaCheia) })} />
            <Cartao titulo={t("pages.energy.injectedCredit")} valor={dinheiro(dados.total.maquinas.valorInjetado)}
              detalhe={t("pages.energy.creditDetail", { energy: kwh(dados.total.maquinas.energiaInjetadaKwh), rate: tarifa(dados.tarifas.tarifaCompensavel) })} />
            <Cartao titulo={t("pages.energy.demandCharges")} valor={dinheiro(dados.total.encargosDemanda)}
              detalhe={t("pages.energy.demandDetail", {
                demand: kw(dados.tarifas.demandaContratadaKw),
                rate: dinheiro(dados.tarifas.tarifaDemanda),
                hours: horas(dados.total.horasPeriodo),
              })} />
            <Cartao titulo={t("common.netCost")} valor={dinheiro(dados.total.custoLiquido)} detalhe={t("pages.energy.netDetail")} destaque />
          </section>
          <p className="stat-detalhe">{t("pages.energy.informative")}</p>

          <section className="card espaco-acima">
            <h2 className="card-title">{t("pages.energy.byMachine")}</h2>
            <div className="tabela-rolagem">
              <table className="tabela" aria-label={t("pages.energy.byMachine")}>
                <thead>
                  <tr>
                    <th scope="col">{t("common.machine")}</th><th scope="col">{t("common.consumption")}</th><th scope="col">{t("common.inputCost")}</th>
                    <th scope="col">{t("common.exportedEnergy")}</th><th scope="col">{t("common.credit")}</th><th scope="col">{t("common.netCost")}</th>
                  </tr>
                </thead>
                <tbody>{dados.maquinas.map((m) => <LinhaMaquina key={m.id} maquina={m} />)}</tbody>
              </table>
            </div>
          </section>

          <section className="card espaco-acima">
            <h2 className="card-title">{t("pages.energy.byLine")}</h2>
            <table className="tabela" aria-label={t("pages.energy.byLine")}>
              <thead>
                <tr>
                  <th scope="col">{t("common.line")}</th><th scope="col">{t("common.consumption")}</th><th scope="col">{t("common.inputCost")}</th>
                  <th scope="col">{t("common.credit")}</th><th scope="col">{t("common.netCost")}</th>
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
            <p className="stat-detalhe">{t("pages.energy.injectionChargesNote")}</p>
          </section>

          <TarifasEnergia tarifas={dados.tarifas} podeEditar={perfil === "ENGENHEIRO"} />

          <SobreEstesDados maquina={t("pages.energy.allMachinesData", { count: dados.maquinas.length })}
            fonte={t("pages.energy.source")} frequencia={t("pages.energy.frequency")}
            periodo={textoPeriodo(dados.inicio, dados.fim)}
            formulas={["consumo", "custoEntrada", "energiaInjetada", "valorInjetado", "encargos", "custoLiquido"]} />
        </>
      )}
    </>
  );
}
