// Grupo de opções exclusivas com cara de botões (rádios de verdade, para teclado e leitor de tela).
export default function SeletorOpcoes({ legenda, nome, opcoes, valor, onChange }) {
  return (
    <fieldset className="seletor-periodo">
      <legend className="sr-only">{legenda}</legend>
      {opcoes.map(([opcao, rotulo]) => (
        <label key={opcao} className={valor === opcao ? "ativo" : ""}>
          <input type="radio" name={nome} value={opcao} checked={valor === opcao} onChange={() => onChange(opcao)} />
          {rotulo}
        </label>
      ))}
    </fieldset>
  );
}
