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
  auth/          # sessão (AuthContext), rotas protegidas e permissões por perfil
  components/    # componentes React
  pages/         # telas/rotas
  services/      # cliente único da API (axios) e consultas por assunto (ex.: maquinas.js)
  test/          # apoio aos testes
index.html
vite.config.js
```

## Autenticação / Login

- O login envia e-mail e senha para `POST /api/auth/login` e recebe um token JWT (válido por
  8 horas), guardado pelo `AuthContext`, o único lugar que lê ou grava a sessão.
- Toda chamada ao backend passa por `services/api.js`, que anexa o token. Se o backend
  recusar o token (401), a sessão acaba e o login mostra "Sua sessão expirou".
- As telas que cada perfil vê estão em `auth/permissoes.js`; `RotaProtegida` aplica essas
  regras às rotas, e o backend aplica as mesmas regras na API.
- Depois do login, o ADMIN vai para Usuários e os demais perfis para o Painel.
- "Esqueci minha senha" orienta a procurar o gestor: quem redefine é o ADMIN.

## Máquinas

- As telas de produção (Painel e Status da Máquina) têm uma lista de máquinas ao lado do título.
  A escolha fica na URL (`?maquina=<id>`), então continua valendo ao trocar de tela pelo menu e
  ao recarregar. O Painel começa em "Todas as máquinas"; o Status, na primeira da lista.
- A tela Máquinas lista setor, linha, faixa de temperatura e limite crítico de cada máquina.
  O ENGENHEIRO cria, edita e desativa, vendo na hora o limite crítico que os números geram;
  o DIRETOR só consulta.

## Indicadores

| Tela | O que mostra | Perfis |
|---|---|---|
| Painel principal | "Todas as máquinas": um card por máquina, por linha (status, temperatura, OEE da hora); uma máquina: o resumo dela | Operário, Engenheiro, Diretor |
| Status da Máquina | Status, temperatura × faixa com aviso, peças, paradas e gráfico de 2 h com faixa e limite crítico | Operário, Engenheiro, Diretor |
| OEE | Última hora ou turno, D × P × Q com a conta; MTBF e tempo parado para Engenheiro e Diretor; 24 h hora a hora | Operário, Engenheiro, Diretor |
| Produtividade | Peças por hora, boas × defeituosas, 24 h, e comparativo por linha, setor ou máquina | Operário, Engenheiro, Diretor |
| Energia | Consumo, energia injetada, encargos e custo líquido por máquina, linha e fábrica; tarifas (Engenheiro edita) | Engenheiro, Diretor |
| Custos e Lucros | Custo, receita e lucro por máquina, linha e fábrica | Diretor |

Todas têm o bloco "Sobre estes dados" (máquina, fonte, frequência, última leitura ou período e as
fórmulas). As telas ao vivo buscam os dados de novo a cada 10 s; histórico, comparativos, custos e
energia, a cada minuto. As consultas ficam em `services/indicadores.js`.

## Deploy

Configurado via `vercel.json` para deploy no Vercel.

## Roadmap

- [x] Autenticação real de sessão (token JWT, alinhado com o backend)
- [x] Testes automatizados (Vitest + Testing Library)
- [x] Cadastro de máquinas e seletor de máquina nas telas de produção
- [x] Indicadores reais (OEE, produtividade, custos e energia) no lugar dos números fixos
- [ ] Report de manutenção em kanban
- [ ] Dark mode
- [x] CI (lint, testes e build em pull requests) — `.github/workflows/ci.yml` na raiz

## Licença

Projeto de uso pessoal/acadêmico. Não distribuído sob licença open source.
