import React from "react";

export default function Topbar() {
  // ==========================================
  // 1. GERENCIAMENTO DE ESTADO / DADOS DO USUÁRIO
  // ==========================================

  // Busca a string de texto que o login salvou no navegador
  const usuarioData = localStorage.getItem("usuarioLogado");

  // Converte o texto JSON de volta para um Objeto JavaScript para podermos usar as propriedades
  // Se não houver ninguém logado (ex: deslogado), cria um usuário "Visitante" padrão para o sistema não quebrar
  const usuarioLogado = usuarioData ? JSON.parse(usuarioData) : {
    nome: "Visitante",
    cargo: { nomeCargo: "Padrão" }
  };

  // Extrai o nome do cargo de dentro do objeto aninhado vindo do Java.
  // Se por acaso o objeto cargo estiver nulo, define o texto "Sem Cargo" por segurança.
  const nomeDoCargo = usuarioLogado.cargo?.nomeCargo || "Sem Cargo";

  // Função que analisa o nome do cargo e retorna a classe CSS correspondente.
  // Isso serve para pintar a etiqueta (badge) com cores diferentes baseadas no cargo.
  const obterClasseCargo = (cargo) => {
    switch (cargo?.toLowerCase()) {
      case "diretor":
        return "tag-diretor";       
      case "operario":
      case "operário":
        return "tag-operario";      
      case "suporte":
        return "tag-suporte";       
      default:
        return "tag-padrao";       
    }
  };


  return (
    <div className="topbar">

      {/* LADO ESQUERDO DA BARRA SUPERIOR */}
      {/* Espaço reservado caso queira colocar um título de página */}
      <div className="topbar-left"></div>

      {/* LADO DIREITO DA BARRA SUPERIOR */}
      <div className="topbar-right">

        {/* BOTÃO DE NOTIFICAÇÕES */}
        <button className="topbar-icon" title="Notificações">
          {/* Ícone de um Sino em formato SVG vetorial */}
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

        {/* CAIXA DO PERFIL DO USUÁRIO  */}
        <div className="user-profile-box">

          {/* CONTAINER DOS TEXTOS  */}
          <div className="user-text-info"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",    
              justifyContent: "center", 
              textAlign: "center"
            }}>

            {/* Nome dinâmico obtido direto do banco de dados através do login */}
            <span className="user-name">{usuarioLogado.nome}</span>

            {/* Etiqueta (Badge) do cargo dinâmico */}
            {/* O classname injeta dinamicamente a cor da tag, e o .toUpperCase() deixa o texto em letras maiúsculas */}
            <span className={`user-role-badge ${obterClasseCargo(nomeDoCargo)}`} style={{ fontSize: "11px", fontWeight: "bold" }}>
              {nomeDoCargo.toUpperCase()}
            </span>
          </div>

          {/* BOTÃO COM O ÍCONE DO PERFIL */}
          <button className="topbar-icon profile-active" title="Perfil">
            {/* Ícone de um Bonequinho (Usuário) em formato SVG vetorial */}
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

        </div> {/* Fim da user-profile-box */}
      </div> {/* Fim da topbar-right */}
    </div> /* Fim da classe principal topbar */
  );
}