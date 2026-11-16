# Spec: monorepo — V1

Status: aprovado
Módulo: `monorepo` (Marco 0) — ver CAPABILITY-MAP.md
Fonte: documento "AmbyData — Decisões do Projeto", seção "Monorepo e infraestrutura"

## Objective

Unir `ErickWL/Ambydata-backend` e `ErickWL/Ambydata-react` num único repositório `Ambydata`
na conta do Guilherme, com o histórico dos dois preservado, CI rodando em todo PR, deploys
apontando para o novo repositório e as skills de desenvolvimento (addyosmani/agent-skills)
disponíveis para o grupo inteiro.

Usuários: os 5 integrantes do grupo (desenvolvedores). Nenhuma mudança de comportamento
para quem usa o sistema: login e dashboard continuam funcionando exatamente como hoje.

## Tech Stack

- Backend: Java 21, Spring Boot 4.0.9, Maven Wrapper, MongoDB (inalterado neste marco)
- Frontend: Node 20+, React 19, Vite 8, ESLint 10 (inalterado neste marco)
- CI: GitHub Actions
- Deploy: Vercel (frontend), Render via Dockerfile (backend)
- Skills: addyosmani/agent-skills, licença MIT, fixado no commit `39b723c`

## Commands

```
# Backend (a partir de backend/)
./mvnw -B verify                 # build + testes (precisa de MONGODB_URI)
./mvnw spring-boot:run           # dev, porta 8080

# Frontend (a partir de frontend/)
npm ci                           # instala exatamente o lockfile
npm run lint
npm run build
npm run dev                      # dev, porta 5173
```

## Project Structure

```
Ambydata/
  backend/                  código atual do Ambydata-backend, sem mudanças de conteúdo
  frontend/                 código atual do Ambydata-react, sem mudanças de conteúdo
  .github/workflows/ci.yml  jobs backend e frontend, disparados por paths
  .claude/
    skills/                 cópia de agent-skills/skills/ (25 skills)
    agents/                 code-reviewer, security-auditor, test-engineer, web-performance-auditor
    commands/               spec, plan, build, test, review, constraints, code-simplify, ship, webperf
    references/             checklists usados pelas skills
    AGENT-SKILLS.md         origem, commit fixado, licença MIT e como atualizar
  CAPABILITY-MAP.md
  SPEC-monorepo.md          (e os próximos SPEC-<module-id>.md)
  tasks/                    plan.md e todo.md gerados pelo /plan
  README.md                 visão geral, como rodar os dois, links para os READMEs internos
  .gitignore                regras dos dois projetos combinadas
```

## Code Style

Este marco não escreve código de aplicação. Convenções que passam a valer:

- Commits no padrão Conventional Commits, em português: `feat(identity): emite JWT no login`
- Branches por tarefa: `feat/<assunto>`, `fix/<assunto>`, `chore/<assunto>`
- Escopo do commit = module id do CAPABILITY-MAP quando aplicável

## Testing Strategy

- Backend: o teste existente (`contextLoads`) roda no CI contra um MongoDB de serviço do
  GitHub Actions (`services: mongo`), com `MONGODB_URI` e `JWT_SECRET` de teste.
  Testcontainers chega no módulo `identity`.
- Frontend: CI roda `npm ci` + `npm run build` como bloqueantes.
- Verificação manual pós-deploy: login com o admin do seed na URL nova da Vercel,
  contra a URL nova do Render.

## Boundaries

- Always: preservar o histórico de commits dos dois repositórios; manter os repositórios
  antigos intocados; rodar build dos dois lados antes de cada commit.
- Ask first: qualquer mudança em código de aplicação; mexer em variáveis de ambiente de
  produção; desligar os deploys antigos.
- Never: commitar segredos (`MONGODB_URI`, `JWT_SECRET`, senhas do seed); force-push na `main`;
  apagar ou arquivar os repositórios do Erick.

## Success Criteria

1. `git log --follow backend/src/main/java/com/ambydata/ambydata_backend/service/UsuarioService.java`
   mostra os commits originais (inclusive os do PR #1).
2. `git log --follow frontend/src/components/Login.jsx` mostra os commits originais do React.
3. A árvore de `backend/` é idêntica à `main` do Ambydata-backend, e a de `frontend/` à `main`
   do Ambydata-react, exceto pelos ajustes listados abaixo.
4. Ajustes mínimos, cada um num commit próprio:
   - `backend/mvnw` com permissão de execução (hoje está 100644, e `./mvnw` falha no CI)
   - `frontend/package-lock.json` regenerado (hoje `npm ci` falha: lockfile fora de sincronia)
   - `pom.xml` com `java.version` 21, alinhado ao Dockerfile
5. O CI roda em PR e push na `main`, e fica verde: o job backend só roda quando `backend/**` muda,
   o job frontend só quando `frontend/**` muda.
6. `.claude/` contém as skills, agentes, comandos e referências, com AGENT-SKILLS.md
   explicando origem, commit e licença; uma sessão do Claude Code aberta no repositório
   lista os comandos `/spec`, `/plan` e `/build`.
7. A Vercel (Root Directory `frontend`) e o Render (Root Directory `backend`) publicam a
   partir do novo repositório, e o login com o admin do seed funciona na URL nova.
8. README.md da raiz explica a estrutura, como rodar cada lado e onde ficam specs e skills.

## Out of Scope (Deferred)

- Corrigir os 8 erros de lint do frontend: somem com a reescrita do AuthContext em `identity`.
- Qualquer mudança de comportamento (JWT, perfis, URLs da API): módulo `identity`.
- Testcontainers e testes novos: módulo `identity`.
- Desligar os deploys antigos: depois da validação dos novos, decisão do grupo.
- Proteção da branch `main`: o Guilherme ativa após o primeiro CI verde (configuração do GitHub).

## Decisões (antes perguntas em aberto)

1. Lint do frontend roda no CI como não bloqueante (`continue-on-error`) até o módulo `identity`.
2. O comando `/review` das skills é renomeado para `/revisar` na cópia em `.claude/commands/`.
