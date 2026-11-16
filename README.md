# AmbyData

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0.9-brightgreen)
![React](https://img.shields.io/badge/React-19-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)

Sistema de monitoramento industrial para o setor alimentício, desenvolvido como Projeto
Integrador da Fatec Indaiatuba. Captura leituras das máquinas, calcula indicadores como
OEE, MTBF e lucro, e mostra cada informação ao perfil certo: Operário, Engenheiro,
Diretor e Admin.

Este repositório reúne o backend e o frontend, que antes viviam em
`ErickWL/Ambydata-backend` e `ErickWL/Ambydata-react`. O histórico de commits dos dois
foi preservado.

## Estrutura

```text
backend/      API em Java 21 + Spring Boot + MongoDB          → backend/README.md
frontend/     Interface em React 19 + Vite                    → frontend/README.md
.github/      CI (GitHub Actions)
.claude/      Skills, agentes e comandos de desenvolvimento   → .claude/AGENT-SKILLS.md
CAPABILITY-MAP.md   Módulos do sistema e ordem de construção
SPEC-*.md           Especificação de cada módulo
tasks/              Plano e lista de tarefas do módulo em andamento
```

## Como rodar

### Backend

Pré-requisitos: JDK 21 e um MongoDB acessível (Atlas ou local).

```bash
cd backend
export MONGODB_URI="mongodb+srv://<usuario>:<senha>@<cluster>/"
export JWT_SECRET="$(openssl rand -base64 48)"   # 32+ caracteres aleatórios
./mvnw spring-boot:run
```

A API sobe em `http://localhost:8080`. No Windows, use `.\mvnw.cmd` no lugar de `./mvnw`.

Por padrão o backend usa o banco `ambydata_dev`; no deploy, defina `MONGODB_DATABASE=ambydata_prod`.

Os testes sobem um MongoDB descartável sozinhos (Testcontainers). Só precisam do Docker rodando,
sem `MONGODB_URI`:

```bash
./mvnw verify
```

Para criar o primeiro usuário, defina também `ADMIN_EMAIL`, `ADMIN_SENHA` e, opcionalmente,
`ADMIN_NOME` antes de iniciar. Com `DEMO_SENHA` definida, sobem também `operario@`,
`engenheiro@` e `diretor@ambydata.demo`, um por perfil. Com o backend rodando, a documentação
da API fica em `http://localhost:8080/swagger-ui`.

### Frontend

Pré-requisito: Node.js 20.19+ ou 22.13+ (exigência do Vite 8 e do ESLint 10).

```bash
cd frontend
npm ci
cp -n .env.example .env   # não sobrescreve um .env existente
npm run dev
```

A interface sobe em `http://localhost:5173`. Outros comandos: `npm test`, `npm run lint`,
`npm run build`.

Nunca versione credenciais: os arquivos `.env` são ignorados pelo Git.

## Deploy

O backend roda no Render (Docker, Root Directory `backend`) e o frontend na Vercel (Root
Directory `frontend`); os dois publicam a partir da `main`.

| Onde | Variável | Valor |
|---|---|---|
| Render | `MONGODB_URI` | URI do cluster no Atlas |
| Render | `MONGODB_DATABASE` | `ambydata_prod` |
| Render | `JWT_SECRET` | aleatório, 32+ caracteres (`openssl rand -base64 48`), diferente do local |
| Render | `CORS_ORIGINS` | URL do frontend na Vercel (várias, separadas por vírgula) |
| Render | `ADMIN_EMAIL`, `ADMIN_SENHA`, `ADMIN_NOME` | primeiro ADMIN; remova `ADMIN_SENHA` depois da primeira subida |
| Render | `DEMO_SENHA` | opcional: usuários de demonstração; use uma senha forte |
| Render | `JWT_EXPIRACAO_HORAS` | opcional, padrão 8 |
| Vercel | `VITE_API_URL` | URL do backend no Render, sem barra no final |

## Como trabalhamos

- A `main` só recebe código por Pull Request, com uma aprovação e o CI verde.
- Uma branch por tarefa: `feat/<assunto>`, `fix/<assunto>`, `chore/<assunto>`.
- Commits no padrão Conventional Commits, em português, com o módulo como escopo:
  `feat(identity): emite JWT no login`.
- Cada módulo do [CAPABILITY-MAP.md](CAPABILITY-MAP.md) passa por especificação, plano,
  implementação e revisão, usando os comandos de `.claude/`:

| Etapa | Comando | Resultado |
|---|---|---|
| Especificar | `/spec` | `SPEC-<modulo>.md` |
| Planejar | `/plan` | `tasks/plan.md` e `tasks/todo.md` (o do identity está em `tasks/plan-identity.md`) |
| Construir | `/build` | Uma tarefa por vez, com teste primeiro |
| Testar | `/test` | Testes que provam o comportamento |
| Revisar | `/revisar` | Revisão em cinco eixos antes do merge |
| Simplificar | `/code-simplify` | Menos complexidade, mesmo comportamento |
| Entregar | `/ship` | Checklist de deploy |

## CI

O workflow `.github/workflows/ci.yml` roda em todo Pull Request e em todo push na `main`:

- **backend:** `./mvnw -B verify` com Java 21 e um MongoDB do Testcontainers, quando `backend/` muda;
- **frontend:** `npm ci`, `npm run lint`, `npm test` e `npm run build`, quando `frontend/` muda;
- **ci-ok:** resume o resultado dos dois. É o único check obrigatório na proteção da `main`.

Uma mudança no próprio `ci.yml` dispara os dois lados.

## Licença

Projeto de uso pessoal/acadêmico. Não distribuído sob licença open source. As skills em
`.claude/` são de terceiros, sob licença MIT (ver `.claude/AGENT-SKILLS.md`).
