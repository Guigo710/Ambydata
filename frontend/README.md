# AmbyData — Frontend

![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-8-purple)
![Node](https://img.shields.io/badge/node-20%2B-green)
![License](https://img.shields.io/badge/license-uso%20pessoal%2Facad%C3%AAmico-lightgrey)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)

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

- Node.js 20+
- API do backend rodando (local ou deployada) — veja [`Ambydata-backend`](https://github.com/ErickWL/Ambydata-backend)

## Instalação e execução

Clone o repositório:

```bash
git clone https://github.com/ErickWL/Ambydata-react.git
cd Ambydata-react
```

Instale as dependências:

```bash
npm install
```

### Variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

`.env.example` (versionado, sem segredos):

```env
VITE_API_URL=http://localhost:8080
```

Ajuste `VITE_API_URL` para apontar para a API local ou deployada.

### Rodando em desenvolvimento

```bash
npm run dev
```

A aplicação sobe por padrão em `http://localhost:5173`.

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento (Vite) |
| `npm run build` | Gera build de produção |
| `npm run preview` | Serve o build de produção localmente |
| `npm run lint` | Roda o ESLint |

## Estrutura do projeto

```
public/          # assets estáticos
src/
  components/    # componentes React
  pages/         # telas/rotas
  services/      # chamadas à API (axios)
index.html
vite.config.js
```

## Autenticação / Login

O frontend possui um formulário de login que envia e-mail/senha para `POST /api/usuarios/login` no backend. O backend confere as credenciais no banco e, se corretas, retorna o usuário — liberando o acesso ao dashboard no frontend.

⚠️ **Atenção:** o backend atual não emite token (JWT ou similar) nessa etapa — veja a seção de Autenticação do [README do backend](https://github.com/ErickWL/Ambydata-backend). Ou seja, o "login" apenas confirma as credenciais uma vez; não há sessão validada nas requisições seguintes. Trate como autenticação provisória, não pronta para produção.

## Deploy

Configurado via `vercel.json` para deploy no Vercel.

## Roadmap

- [ ] Autenticação real de sessão (token JWT + persistência segura, alinhado com o backend)
- [ ] Testes automatizados (componentes e integração)
- [ ] Dark mode
- [ ] CI (lint + build em pull requests)

## Licença

Projeto de uso pessoal/acadêmico. Não distribuído sob licença open source.
