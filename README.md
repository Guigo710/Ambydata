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
export JWT_SECRET="<segredo-local>"
./mvnw spring-boot:run
```

A API sobe em `http://localhost:8080`. Testes: `./mvnw verify`.
Para criar o primeiro usuário, defina também `ADMIN_EMAIL`, `ADMIN_SENHA` e, opcionalmente,
`ADMIN_NOME` antes de iniciar.

### Frontend

Pré-requisito: Node.js 20 ou superior.

```bash
cd frontend
npm ci
echo "VITE_API_URL=http://localhost:8080" > .env
npm run dev
```

A interface sobe em `http://localhost:5173`. Outros comandos: `npm run lint`, `npm run build`.

Nunca versione credenciais: os arquivos `.env` são ignorados pelo Git.

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
| Planejar | `/plan` | `tasks/plan.md` e `tasks/todo.md` |
| Construir | `/build` | Uma tarefa por vez, com teste primeiro |
| Testar | `/test` | Testes que provam o comportamento |
| Revisar | `/revisar` | Revisão em cinco eixos antes do merge |
| Simplificar | `/code-simplify` | Menos complexidade, mesmo comportamento |
| Entregar | `/ship` | Checklist de deploy |

## CI

O workflow `.github/workflows/ci.yml` roda em todo Pull Request e em todo push na `main`:

- **backend:** `./mvnw -B verify` com Java 21 e um MongoDB temporário, quando `backend/` muda;
- **frontend:** `npm ci`, `npm run lint` (ainda não bloqueante) e `npm run build`, quando
  `frontend/` muda.

## Licença

Projeto de uso pessoal/acadêmico. Não distribuído sob licença open source. As skills em
`.claude/` são de terceiros, sob licença MIT (ver `.claude/AGENT-SKILLS.md`).
