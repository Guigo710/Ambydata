import SeletorMaquina from "../components/SeletorMaquina";
import { useMaquinaSelecionada } from "../services/maquinas";

// OEE da máquina escolhida: hora e turno, decomposto em D × P × Q (conteúdo na Tarefa 8).
export default function OEE() {
  const selecao = useMaquinaSelecionada();
  return (
    <div className="page-header cabecalho-com-seletor">
      <div>
        <h1 className="page-title">OEE em tempo real</h1>
        <p className="page-greeting">Disponibilidade × Performance × Qualidade</p>
      </div>
      <SeletorMaquina selecao={selecao} />
    </div>
  );
}
