import { useTranslation } from "react-i18next";
import { FORMULAS, NOME_DA_ORIGEM, tempoDesde, useRelogio } from "../services/indicadores";

// De onde vem o que a tela mostra: máquina, fonte, frequência, última leitura (ou o período,
// nas telas feitas de agregados por hora) e, ao abrir, as fórmulas usadas (SPEC-indicadores:
// o usuário precisa saber o que está vendo).
// `agora` fixo só nos testes; na tela, o relógio anda a cada segundo.
export default function SobreEstesDados({
  maquina, ultimaLeitura, frequenciaSegundos = 10, formulas = [], agora, fonte, frequencia, periodo,
}) {
  const { t } = useTranslation();
  const relogio = useRelogio();
  const origem = ultimaLeitura
    ? t(`dataInfo.sources.${ultimaLeitura.origem}`, { defaultValue: NOME_DA_ORIGEM[ultimaLeitura.origem] ?? ultimaLeitura.origem })
    : "—";
  return (
    <section className="card sobre-dados" aria-label={t("dataInfo.title")}>
      <h2 className="sobre-dados-titulo">{t("dataInfo.title")}</h2>
      <dl className="sobre-dados-lista">
        <div><dt>{t("dataInfo.machine")}</dt><dd>{maquina}</dd></div>
        <div><dt>{t("dataInfo.source")}</dt><dd>{fonte ?? origem}</dd></div>
        <div><dt>{t("dataInfo.frequency")}</dt><dd>{frequencia ?? t("dataInfo.everySeconds", { count: frequenciaSegundos })}</dd></div>
        {periodo
          ? <div><dt>{t("dataInfo.period")}</dt><dd>{periodo}</dd></div>
          : <div><dt>{t("dataInfo.lastReading")}</dt><dd>{tempoDesde(ultimaLeitura?.instante, agora ?? relogio, t)}</dd></div>}
      </dl>
      {formulas.length > 0 && (
        <details className="sobre-dados-formulas">
          <summary>{t("dataInfo.howCalculated")}</summary>
          <ul>
            {formulas.map((chave) => (
              <li key={chave}>{t(`dataInfo.formulas.${chave}`, { defaultValue: FORMULAS[chave] })}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
