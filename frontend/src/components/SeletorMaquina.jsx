import { useTranslation } from "react-i18next";
import { porLinha } from "../services/maquinas";

export default function SeletorMaquina({ selecao, permitirTodas = false }) {
  const { t } = useTranslation();
  const { maquina, maquinas, carregando, erro, escolher } = selecao;
  // Só mostra a lista pronta: um <select> vazio enquanto carrega pareceria "nenhuma máquina".
  if (carregando) return <span className="seletor-maquina seletor-carregando" role="status">{t("machines.loading")}</span>;
  if (erro) return <span className="seletor-maquina seletor-carregando" role="alert">{t("machines.loadError")}</span>;
  return (
    <div className="seletor-maquina">
      <label htmlFor="seletor-maquina" className="sr-only">{t("common.machine")}</label>
      <select id="seletor-maquina" value={maquina?.id ?? ""}
        onChange={(e) => escolher(e.target.value)}>
        {permitirTodas && <option value="">{t("machines.all")}</option>}
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
