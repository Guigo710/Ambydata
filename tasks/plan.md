# Implementation Plan: monorepo (Marco 0)

Source spec: SPEC-monorepo.md

## Overview

Montar localmente o repositório `Ambydata` a partir dos dois repositórios existentes, com o
histórico reescrito para as pastas `backend/` e `frontend/`, aplicar os três ajustes mínimos,
adicionar README, CI e as skills, e então publicar no repositório vazio do Guilherme. Os
deploys e a proteção da `main` são passos manuais do Guilherme no fim.

## Architecture Decisions

- **Histórico via `git filter-repo --to-subdirectory-filter`** em clones completos de cada
  repositório, seguido de `git merge --allow-unrelated-histories`. Cada arquivo fica com o
  histórico no caminho novo, então `git log --follow` funciona. `git subtree add` foi
  descartado: ele preserva os commits, mas o histórico só aparece com `--follow` em alguns casos.
- **Base = `main` de cada repositório**, no estado atual (backend `22464b6`, frontend `d118e0e` ou
  mais recente no momento da execução).
- **Ajustes mínimos em commits separados** (mvnw executável, lockfile, Java 21), para que a
  junção em si não altere nenhum conteúdo.
- **CI com `paths` por job** e um MongoDB de serviço para o `contextLoads`.
- **Skills copiadas, não instaladas como plugin**: funcionam em qualquer sessão (local ou nuvem)
  sem passo extra, fixadas no commit `39b723c`. As referências `agent-skills:<nome>` dos comandos
  viram `<nome>`, porque sem plugin não há prefixo.
- **Primeiro push direto na `main`** do repositório vazio (é o conteúdo inicial). Daí em diante,
  tudo entra por Pull Request.

## Task List

### Phase 1: Montagem local (nada é publicado)

#### Task 1: Clonar os dois repositórios com histórico completo
**Description:** Clonar `Ambydata-backend` e `Ambydata-react` sem `--depth`, numa pasta de
trabalho separada, e instalar o `git-filter-repo`.
**Acceptance criteria:**
- [ ] `git rev-list --count HEAD` bate com o número de commits da `main` no GitHub, nos dois clones
- [ ] `git filter-repo --version` responde
**Verification:**
- [ ] Manual: comparar a contagem de commits com a página de commits de cada repositório
**Dependencies:** None
**Files likely touched:** nenhum arquivo do projeto (só clones de trabalho)
**Estimated scope:** XS

#### Task 2: Reescrever cada histórico para a sua pasta e juntar
**Description:** Rodar `filter-repo --to-subdirectory-filter backend` e `... frontend`; criar o
repositório `Ambydata` local e fazer merge dos dois históricos com `--allow-unrelated-histories`.
**Acceptance criteria:**
- [ ] `git log --follow backend/src/main/java/com/ambydata/ambydata_backend/service/UsuarioService.java` mostra os commits originais, inclusive o do PR #1
- [ ] `git log --follow frontend/src/components/Login.jsx` mostra os commits originais do React
- [ ] `git diff` entre `backend/` e a `main` do backend, e entre `frontend/` e a `main` do React, é vazio
**Verification:**
- [ ] Manual: os três comandos acima
**Dependencies:** Task 1
**Files likely touched:** histórico inteiro (sem mudança de conteúdo)
**Estimated scope:** S

#### Task 3: Aplicar os três ajustes mínimos
**Description:** Três commits: `chore(backend): torna mvnw executável`,
`chore(backend): alinha Java 21 no pom`, `chore(frontend): regenera package-lock`.
**Acceptance criteria:**
- [ ] `git ls-files -s backend/mvnw` mostra `100755`
- [ ] `backend/pom.xml` tem `<java.version>21</java.version>`
- [ ] `npm ci` em `frontend/` termina sem erro
**Verification:**
- [ ] Build: `mvn -B -DskipTests package` em `backend/` (o wrapper não baixa o Maven nesta sessão por causa do proxy; no CI usa `./mvnw`)
- [ ] Build: `npm ci && npm run build` em `frontend/`
**Dependencies:** Task 2
**Files likely touched:** `backend/mvnw`, `backend/pom.xml`, `frontend/package-lock.json`
**Estimated scope:** S

### Checkpoint: Montagem
- [ ] Histórico e conteúdo conferidos (Tasks 1–3)
- [ ] Backend compila, frontend instala e gera build

### Phase 2: Arquivos da raiz

#### Task 4: README, .gitignore, mapa, spec e plano na raiz
**Description:** README.md da raiz (estrutura, como rodar cada lado, onde ficam specs e skills,
links para os READMEs internos); `.gitignore` da raiz para itens comuns (`.idea/`, `.DS_Store`,
`.env`; `.vscode/` fica de fora porque anularia o `!.vscode/extensions.json` do frontend); copiar `CAPABILITY-MAP.md`, `SPEC-monorepo.md` e `tasks/`.
**Acceptance criteria:**
- [ ] README explica os comandos de dev de cada lado e as variáveis de ambiente sem valores reais
- [ ] Os `.gitignore` internos continuam valendo (nenhum arquivo ignorado antes passa a ser rastreado)
**Verification:**
- [ ] Manual: `git status --ignored` antes e depois não muda o conjunto de ignorados em `backend/` e `frontend/`
**Dependencies:** Task 3
**Files likely touched:** `README.md`, `.gitignore`, `CAPABILITY-MAP.md`, `SPEC-monorepo.md`, `tasks/plan.md`, `tasks/todo.md`
**Estimated scope:** M

#### Task 5: Workflow de CI
**Description:** `.github/workflows/ci.yml` com dois jobs. Backend: Temurin 21, cache Maven,
serviço `mongo:7`, `MONGODB_URI=mongodb://localhost:27017` e `JWT_SECRET` de teste,
`./mvnw -B verify`. Frontend: Node 20, cache npm, `npm ci`, `npm run lint` (`continue-on-error`),
`npm run build`. Disparo em `pull_request` e `push` na `main`, filtrado por `paths`.
**Acceptance criteria:**
- [ ] Um PR que só muda `frontend/**` não roda o job backend, e vice-versa
- [ ] Os dois jobs ficam verdes no primeiro push
**Verification:**
- [ ] Manual: validar o YAML localmente (`python -c "import yaml..."`); o resultado real só aparece no GitHub após a Task 7
**Dependencies:** Task 3
**Files likely touched:** `.github/workflows/ci.yml`
**Estimated scope:** XS

#### Task 6: Skills, agentes e comandos em `.claude/`
**Description:** Copiar `skills/`, `agents/`, `references/` e os comandos de
`agent-skills@39b723c` para `.claude/`; renomear `review.md` para `revisar.md`; trocar
`agent-skills:<nome>` por `<nome>` nos comandos; escrever `.claude/AGENT-SKILLS.md`
(origem, commit, licença MIT com o texto, como atualizar).
**Acceptance criteria:**
- [ ] `.claude/skills/` tem as 25 skills; `.claude/agents/` os 4 agentes; `.claude/commands/` os 9 comandos com `revisar.md`
- [ ] Nenhuma ocorrência de `agent-skills:` em `.claude/commands/`
- [ ] Os links `../../references/...` das skills resolvem para arquivos existentes
**Verification:**
- [ ] Manual: `grep -rn "agent-skills:" .claude/commands` vazio; script que confere cada link `../../references/`
**Dependencies:** Task 4
**Files likely touched:** `.claude/**` (cópia de terceiros, revisada por amostragem)
**Estimated scope:** S (muitos arquivos, mas cópia mecânica)

### Checkpoint: Repositório pronto
- [ ] Revisão do resultado com o agente `code-reviewer` (README, CI, `.claude/`)
- [ ] Guilherme revisa e aprova antes da publicação

### Phase 3: Publicação e deploys

#### Task 7: Publicar no repositório `Ambydata`
**Description:** Guilherme cria o repositório vazio; ele é anexado à sessão com acesso de push; a
`main` local é publicada; o CI roda pela primeira vez.
**Acceptance criteria:**
- [ ] O GitHub mostra os commits dos dois repositórios na `main`
- [ ] Os dois jobs de CI ficam verdes
**Verification:**
- [ ] Manual: página de commits e aba Actions do repositório
**Dependencies:** Checkpoint "Repositório pronto"
**Files likely touched:** nenhum
**Estimated scope:** XS

#### Task 8 (Guilherme): Novos deploys na Vercel e no Render
**Description:** Projeto novo na Vercel (Root `frontend`, `VITE_API_URL` = URL do Render novo) e
serviço novo no Render (Root `backend`, Dockerfile, `MONGODB_URI`, `JWT_SECRET`, `ADMIN_*`).
Liberar a URL nova da Vercel no CORS do backend se necessário.
**Acceptance criteria:**
- [ ] Login com o admin do seed funciona na URL nova da Vercel
**Verification:**
- [ ] Manual: login e abertura do painel
**Dependencies:** Task 7
**Files likely touched:** nenhum (configuração dos serviços)
**Estimated scope:** XS

#### Task 9 (Guilherme): Colaboradores e proteção da `main`
**Description:** Convidar Erick e o grupo; ativar a proteção da `main` (PR obrigatório, 1
aprovação, check obrigatório `ci-ok`).
**Acceptance criteria:**
- [ ] Um push direto na `main` é recusado
**Verification:**
- [ ] Manual: tentativa de push direto falha
**Dependencies:** Task 7
**Files likely touched:** nenhum
**Estimated scope:** XS

### Checkpoint: Marco 0 completo
- [ ] Todos os Success Criteria do SPEC-monorepo.md atendidos
- [ ] Próximo passo: SPEC-identity.md

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Proxy bloqueia o clone completo (`--unshallow`) | Med | Usar `git fetch --depth=1000`; os dois repositórios têm menos de 100 commits |
| `contextLoads` falha no CI por depender do Atlas | Med | Serviço `mongo:7` no CI com `MONGODB_URI` local |
| CORS do backend não libera a URL nova da Vercel | Med | O backend usa `@CrossOrigin("*")` hoje; conferir na Task 8 antes de mudar algo |
| Lockfile regenerado muda versões de dependências | Low | Build e lint conferidos na Task 3; `^` do package.json limita a faixa |
| Skills copiadas ficam desatualizadas | Low | AGENT-SKILLS.md documenta como atualizar a partir de um commit novo |

## Open Questions

- Nenhuma bloqueante. A Task 7 depende do repositório vazio `Ambydata` existir na conta do Guilherme.
