# AmbyData — Frontend

Frontend do **AmbyData**, dashboard de monitoramento industrial em tempo real: acompanha OEE, produtividade, lucros, desvios, necessidade de manutenção e temperatura das máquinas/produtos.

Este repositório contém apenas a interface. A API está em [`Ambydata-backend`](https://github.com/ErickWL/Ambydata-backend).

**Deploy:** [ambydata-react.vercel.app](https://ambydata-react.vercel.app)

## Stack

- React 19
- Vite 8
- React Router DOM (navegação)
- Recharts (gráficos do dashboard)
- Axios (consumo da API)
- ESLint

## Pré-requisitos

- API do backend rodando (local ou deployada) — veja [`Ambydata-backend`](https://github.com/ErickWL/Ambydata-backend)

## Instalação e execução

Clone o repositório:

\`\`\`bash
git clone https://github.com/ErickWL/Ambydata-react.git
cd Ambydata-react
\`\`\`

Instale as dependências:

\`\`\`bash
npm install
\`\`\`

Configure a URL da API (ex: \`src/services/api.js\` ou variável de ambiente \`.env\`):

\`\`\`env
VITE_API_URL=http://localhost:8080
\`\`\`

Rode em modo desenvolvimento:

\`\`\`bash
npm run dev
\`\`\`

A aplicação sobe por padrão em \`http://localhost:5173\`.

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| \`npm run dev\` | Sobe o servidor de desenvolvimento (Vite) |
| \`npm run build\` | Gera build de produção |
| \`npm run preview\` | Serve o build de produção localmente |
| \`npm run lint\` | Roda o ESLint |

## Estrutura do projeto

\`\`\`
public/          # assets estáticos
src/
  components/    # componentes React
  pages/         # telas/rotas
  services/      # chamadas à API (axios)
index.html
vite.config.js
\`\`\`

## Deploy

Configurado via \`vercel.json\` para deploy no Vercel.

## Roadmap / Status

Projeto em desenvolvimento ativo — telas e integração com a API ainda sujeitas a mudanças.
