import { porLinha } from "../services/maquinas";

export default function SeletorMaquina({ selecao, permitirTodas = false }) {
  const { maquina, maquinas, carregando, erro, escolher } = selecao;
  // Só mostra a lista pronta: um <select> vazio enquanto carrega pareceria "nenhuma máquina".
  if (carregando) return <span className="seletor-maquina seletor-carregando" role="status">Carregando máquinas...</span>;
  if (erro) return <span className="seletor-maquina seletor-carregando" role="alert">Não foi possível carregar as máquinas.</span>;
  return (
    <div className="seletor-maquina">
      <label htmlFor="seletor-maquina" className="sr-only">Máquina</label>
      <select id="seletor-maquina" value={maquina?.id ?? ""}
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
    </div>
  );
}
