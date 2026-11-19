import { useTranslation } from "react-i18next";

// Grupo de opções exclusivas com cara de botões (rádios de verdade, para teclado e leitor de tela).
export default function SeletorOpcoes({ legenda, nome, opcoes, valor, onChange }) {
  const { t } = useTranslation();
  return (
    <fieldset className="seletor-periodo">
      <legend className="sr-only">{t(legenda)}</legend>
      {opcoes.map(([opcao, chaveRotulo]) => (
        <label key={opcao} className={valor === opcao ? "ativo" : ""}>
          <input type="radio" name={nome} value={opcao} checked={valor === opcao} onChange={() => onChange(opcao)} />
          {t(chaveRotulo)}
        </label>
      ))}
    </fieldset>
  );
}
