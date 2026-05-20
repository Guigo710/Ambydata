import React from "react";

export default function Topbar() {
  // Simulando dados do usuário que virão do banco mais tarde
  const usuarioLogado = {
    nome: "Fulano",
    cargo: "Diretor" // Pode testar mudar para "Diretor" ou "Suporte"
  };

  // Função para retornar a classe de estilo baseada no cargo
  const obterClasseCargo = (cargo) => {
    switch (cargo?.toLowerCase()) {
      case "diretor": return "tag-diretor";
      case "operario": case "operário": return "tag-operario";
      case "suporte": return "tag-suporte";
      default: return "tag-padrao";
    }
  };

  return (
    <div className="topbar">
      {/* Lado esquerdo da Topbar (vazio ou podes pôr um título futuramente) */}
      <div className="topbar-left"></div>

      {/* Lado direito onde ficam as notificações e o perfil */}
      <div className="topbar-right">
        <button className="topbar-icon" title="Notificações">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* Bloco de perfil adicionado ao lado do ícone */}
        <div className="user-profile-box">
          <div className="user-text-info">
            <span className="user-name">{usuarioLogado.nome}</span>
            <span className={`user-role-badge ${obterClasseCargo(usuarioLogado.cargo)}`}>
              {usuarioLogado.cargo}
            </span>
          </div>
          
          <button className="topbar-icon profile-active" title="Perfil">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}