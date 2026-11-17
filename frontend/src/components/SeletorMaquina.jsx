import { porLinha } from "../services/maquinas";

export default function SeletorMaquina({ selecao, permitirTodas = false }) {
  const { maquina, maquinas, carregando, erro, escolher } = selecao;
  // Só mostra a lista pronta: um <select> vazio enquanto carrega pareceria "nenhuma máquina".
  if (carregando) return <span className="seletor-maquina seletor-carregando">Carregando máquinas...</span>;
  if (erro) return <span className="seletor-maquina seletor-carregando" role="alert">Não foi possível carregar as máquinas.</span>;
  return (
    <label className="seletor-maquina">
      <span className="sr-only">Máquina</span>
      <select aria-label="Máquina" value={maquina?.id ?? ""}
        onChange={(e) => escolher(e.target.value)}>
        {permitirTodas && <option value="">Todas as máquinas</option>}
        {porLinha(maquinas).map(([linha, daLinha]) => (
          <optgroup key={linha} label={linha}>
            {daLinha.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
