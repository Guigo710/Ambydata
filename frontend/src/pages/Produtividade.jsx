import SeletorMaquina from "../components/SeletorMaquina";
import { useMaquinaSelecionada } from "../services/maquinas";

// Peças por hora e boas × defeituosas, por máquina, setor e linha (conteúdo na Tarefa 9).
export default function Produtividade() {
  const selecao = useMaquinaSelecionada();
  return (
    <div className="page-header cabecalho-com-seletor">
      <div>
        <h1 className="page-title">Produtividade</h1>
        <p className="page-greeting">Peças por hora, boas e defeituosas</p>
      </div>
      <SeletorMaquina selecao={selecao} />
    </div>
  );
}
