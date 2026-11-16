# AmbyData — Frontend

![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-8-purple)
![Node](https://img.shields.io/badge/node-20%2B-green)
![License](https://img.shields.io/badge/license-uso%20pessoal%2Facad%C3%AAmico-lightgrey)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)

Frontend do **AmbyData**, dashboard de monitoramento industrial em tempo real: acompanha OEE, produtividade, lucros, desvios, necessidade de manutenção e temperatura das máquinas/produtos.

Esta pasta contém apenas a interface. A API está em [`../backend`](../backend), no mesmo monorepo; o [README da raiz](../README.md) explica como rodar os dois.

**Deploy:** Vercel, com Root Directory `frontend`.

## Stack

- React 19
- Vite 8
- React Router DOM (navegação)
- Recharts (gráficos do dashboard)
- Axios (consumo da API)
- ESLint

## Pré-requisitos

- Node.js 20.19+ ou 22.13+ (exigência do Vite 8 e do ESLint 10)
- API do backend rodando (local ou deployada) — veja [`../backend`](../backend)

## Instalação e execução

Clone o monorepo e entre na pasta do frontend:

```bash
git clone https://github.com/Guigo710/Ambydata.git
cd Ambydata/frontend
```

Instale as dependências exatamente como estão no lockfile:

```bash
npm ci
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
| `npm test` | Roda os testes (Vitest + Testing Library, ambiente jsdom) |

## Estrutura do projeto

```
public/          # assets estáticos
src/
  components/    # componentes React
  pages/         # telas/rotas
  services/      # chamadas à API (axios) — criada no módulo identity
index.html
vite.config.js
```

## Autenticação / Login

O frontend possui um formulário de login que envia e-mail/senha para `POST /api/usuarios/login` no backend. O backend confere as credenciais no banco e, se corretas, retorna o usuário — liberando o acesso ao dashboard no frontend.

⚠️ **Atenção:** o backend atual não emite token (JWT ou similar) nessa etapa — veja a seção de Autenticação do [README do backend](../backend/README.md#autenticação-e-segurança). Ou seja, o "login" apenas confirma as credenciais uma vez; não há sessão validada nas requisições seguintes. Trate como autenticação provisória, não pronta para produção.

## Deploy

Configurado via `vercel.json` para deploy no Vercel.

## Roadmap

- [ ] Autenticação real de sessão (token JWT + persistência segura, alinhado com o backend)
- [ ] Testes automatizados (componentes e integração)
- [ ] Dark mode
- [x] CI (lint + build em pull requests) — `.github/workflows/ci.yml` na raiz; lint ainda não bloqueante

## Licença

Projeto de uso pessoal/acadêmico. Não distribuído sob licença open source.
