# Implementation Plan: identity (Marco 1)

Source spec: SPEC-identity.md

## Overview

Trocar o login "confere e esquece" por autenticação JWT com 4 perfis aplicados no backend,
dar ao ADMIN a gestão de usuários e a todos a troca da própria senha, e reescrever a camada de
sessão do frontend (cliente único da API, contexto de sessão, rotas e menu por perfil). Cada
tarefa entrega uma fatia testável; o backend vem primeiro porque o frontend consome o contrato.

## Architecture Decisions

- **Um único PR para o módulo**, com um commit por tarefa. Render e Vercel publicam a partir da
  `main`; separar backend e frontend em PRs deixaria o login quebrado entre um merge e outro,
  porque a rota antiga `POST /api/usuarios/login` deixa de existir.
- **Filtro JWT próprio** (`OncePerRequestFilter`) que valida o token e recarrega o usuário no
  Mongo a cada requisição, em vez do resource server OAuth2 do Spring: assim desativação e
  troca de perfil valem na hora (critério 3), sem dependência nova.
- **Permissões por rota no `SecurityConfig`** (`hasRole("ADMIN")` para `/api/usuarios/**`,
  `authenticated()` para o resto, `denyAll()` como padrão). Os módulos seguintes acrescentam
  suas linhas no mesmo lugar.
- **Executor de migrações próprio** (`migracao/`): cada migração é um bean com id fixo; o
  executor roda as que não estão na coleção `migracao`, em ordem, na subida.
- **Testes do backend com Testcontainers** num `@TestConfiguration` compartilhado
  (`@ServiceConnection MongoDBContainer`); o serviço `mongo` sai do CI.
- **Sessão do frontend em `localStorage`** (token + usuário), lida só pelo `AuthContext`; o
  interceptor de 401 limpa a sessão e manda para o login com "Sua sessão expirou".
- **Matriz de permissões do frontend em um arquivo** (`auth/permissoes.js`), usada pelo menu e
  pelas rotas, testada contra a tabela da spec.

## Task List

### Phase 1: Fundação do backend

#### Task 1: Testes com Testcontainers e banco configurável
**Description:** Adicionar `spring-boot-testcontainers` e `testcontainers-mongodb`, criar a
configuração de teste compartilhada, ler o banco de `MONGODB_DATABASE` (padrão `ambydata_dev`)
e tirar o serviço `mongo` do CI.
**Acceptance criteria:**
- [ ] `contextLoads` passa sem `MONGODB_URI` definido, usando o container
- [ ] `application.yml` usa `${MONGODB_DATABASE:ambydata_dev}`
- [ ] `ci.yml` não tem mais `services: mongo` e o job backend continua verde
**Verification:**
- [ ] Tests pass: `./mvnw -B verify` (com Docker)
- [ ] Manual: CI do PR verde
**Dependencies:** None
**Files likely touched:** `backend/pom.xml`, `backend/src/main/resources/application.yml`,
`backend/src/test/.../TestcontainersConfig.java`, `backend/src/test/.../AmbydataBackendApplicationTests.java`,
`.github/workflows/ci.yml`
**Estimated scope:** M

#### Task 2: Perfil, entidade Usuario e executor de migrações
**Description:** Criar `usuario/Perfil` (4 valores), mover `Usuario` para `usuario/` com
`perfil` no lugar de `cargo`, e criar o executor de migrações com a migração 001
(`cargo` → `perfil` nos documentos existentes, `DIRETOR`/`OPERARIO` mantidos; índice único de
e-mail).
**Acceptance criteria:**
- [ ] Documento antigo com `cargo: "DIRETOR"` fica com `perfil: "DIRETOR"` e sem `cargo`
- [ ] Subir a aplicação duas vezes aplica a 001 uma vez só (registro na coleção `migracao`)
- [ ] Índice único de e-mail existe após a migração
**Verification:**
- [ ] Tests pass: `./mvnw -B verify -Dtest='Migracao*'`
**Dependencies:** Task 1
**Files likely touched:** `usuario/Perfil.java`, `usuario/Usuario.java`, `usuario/UsuarioRepository.java`,
`migracao/ExecutorMigracoes.java`, `migracao/M001PerfilEIndices.java` (+ teste)
**Estimated scope:** M

#### Task 3: Emissão e validação do JWT
**Description:** `auth/JwtService` (emitir e validar HS256 com `sub` = id e claim `perfil`),
propriedades `JWT_SECRET` e `JWT_EXPIRACAO_HORAS`, falha na subida com segredo menor que 32
caracteres.
**Acceptance criteria:**
- [ ] Token emitido expira no tempo configurado (padrão 8 h)
- [ ] Token adulterado, expirado ou assinado com outro segredo é recusado
- [ ] Segredo com menos de 32 caracteres impede a subida com mensagem clara
**Verification:**
- [ ] Tests pass: `./mvnw -B verify -Dtest='Jwt*'`
**Dependencies:** Task 1
**Files likely touched:** `auth/JwtService.java`, `auth/JwtProperties.java`, `application.yml` (+ teste)
**Estimated scope:** S

#### Task 4: Login, /me e segurança negar-por-padrão
**Description:** `POST /api/auth/login` e `GET /api/auth/me`; filtro JWT que recarrega o
usuário; `SecurityConfig` com regras por rota e `denyAll` padrão; CORS de `CORS_ORIGINS`;
tratamento global de erros no formato da spec. Remove o `UsuarioController` antigo.
**Acceptance criteria:**
- [ ] Login válido → 200 com token e `usuario`; senha errada ou inativo → 401 com a mesma mensagem
- [ ] Sem token → 401; token de usuário desativado depois da emissão → 401
- [ ] Erros de validação saem no formato `{ status, erro, campos }`
**Verification:**
- [ ] Tests pass: `./mvnw -B verify -Dtest='Auth*'`
**Dependencies:** Tasks 2, 3
**Files likely touched:** `auth/AuthController.java`, `auth/JwtAuthFilter.java`,
`config/SecurityConfig.java`, `config/ApiExceptionHandler.java`, `controller/UsuarioController.java` (removido) (+ teste)
**Estimated scope:** M

### Checkpoint: Login
- [ ] `./mvnw -B verify` verde
- [ ] `curl` de login + `/api/auth/me` funciona contra a aplicação local

#### Task 5: Troca da própria senha
**Description:** `PUT /api/auth/me/senha` com `senhaAtual` e `novaSenha` (mínimo 8).
**Acceptance criteria:**
- [ ] Senha atual errada → 400; nova senha curta → 400 com `campos.novaSenha`
- [ ] Depois da troca, login com a senha antiga → 401 e com a nova → 200
**Verification:**
- [ ] Tests pass: `./mvnw -B verify -Dtest='TrocaSenha*'`
**Dependencies:** Task 4
**Files likely touched:** `auth/AuthController.java`, `usuario/UsuarioService.java`, DTO (+ teste)
**Estimated scope:** S

#### Task 6: Gestão de usuários pelo ADMIN
**Description:** `GET/POST /api/usuarios`, `PUT /{id}`, `PATCH /{id}/ativo`,
`PUT /{id}/senha`, com as regras do último ADMIN e de não desativar a si mesmo.
**Acceptance criteria:**
- [ ] Os 4 perfis × as 5 rotas: só ADMIN recebe 2xx, os outros 403 (teste parametrizado)
- [ ] E-mail duplicado → 400; desativar a si mesmo ou o último ADMIN ativo → 409
- [ ] Nenhuma resposta contém `senhaHash`
**Verification:**
- [ ] Tests pass: `./mvnw -B verify -Dtest='UsuarioAdmin*'`
**Dependencies:** Task 4
**Files likely touched:** `usuario/UsuarioAdminController.java`, `usuario/UsuarioService.java`,
`usuario/dto/*.java` (+ teste)
**Estimated scope:** M

#### Task 7: Seed do ADMIN e dos usuários de demonstração; remoção do código morto
**Description:** Reescrever o `DataInitializer` para criar o ADMIN de `ADMIN_*` e, se
`DEMO_SENHA` existir, os 3 usuários de demonstração; apagar `Cargo`, `Metrica`,
`MetricaRepository`, `MetricaController` e os pacotes antigos vazios.
**Acceptance criteria:**
- [ ] Sem `DEMO_SENHA`, nenhum usuário de demonstração é criado; com ela, os 3 existem e logam
- [ ] Rodar o seed duas vezes não duplica nem altera senhas existentes
- [ ] `grep -r "Metrica\|Cargo" backend/src` vazio
**Verification:**
- [ ] Tests pass: `./mvnw -B verify`
**Dependencies:** Task 6
**Files likely touched:** `config/DataInitializer.java`, arquivos removidos (+ teste)
**Estimated scope:** S

#### Task 8: Swagger
**Description:** `springdoc-openapi-starter-webmvc-ui` 3.0.3, esquema de segurança Bearer,
`/swagger-ui/**` e `/v3/api-docs/**` públicos.
**Acceptance criteria:**
- [ ] `/v3/api-docs` lista as 8 rotas da tabela de contrato
- [ ] O botão "Authorize" do Swagger aceita o token e as chamadas funcionam
**Verification:**
- [ ] Tests pass: teste que lê `/v3/api-docs` e confere as rotas
- [ ] Manual: abrir `/swagger-ui` localmente
**Dependencies:** Task 6
**Files likely touched:** `backend/pom.xml`, `config/OpenApiConfig.java`, `config/SecurityConfig.java` (+ teste)
**Estimated scope:** S

### Checkpoint: Backend completo
- [ ] `./mvnw -B verify` verde, critérios 1–5, 9 e 10 da spec cobertos por teste
- [ ] Revisão do backend com o agente `security-auditor`

### Phase 2: Frontend

#### Task 9: Infra de testes, cliente da API e matriz de permissões
**Description:** Instalar Vitest, Testing Library, jsdom e TanStack Query; criar
`services/api.js` (base `VITE_API_URL`, interceptor de token e de 401) e `auth/permissoes.js`.
**Acceptance criteria:**
- [ ] `npm test` roda; `permissoes.js` testado contra a tabela "Telas por perfil" da spec
- [ ] O interceptor anexa `Authorization: Bearer` quando há token e dispara o logout no 401
**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
**Dependencies:** Task 8 (contrato estável)
**Files likely touched:** `frontend/package.json`, `vite.config.js`, `src/services/api.js`,
`src/auth/permissoes.js` (+ testes)
**Estimated scope:** M

#### Task 10: AuthContext, rotas protegidas e tela de login
**Description:** `AuthContext` (login, logout, usuário, perfil), `RotaProtegida`, rotas do
`App` com redirecionamento por perfil, `Login` movido para `pages/` e ligado ao novo endpoint;
"Esqueci minha senha" → "Procure seu gestor".
**Acceptance criteria:**
- [ ] ADMIN vai para `/usuarios` após login; os demais para `/painel`
- [ ] OPERARIO em `/usuarios` → `/painel`; sem sessão → login
- [ ] 401 durante o uso → login com "Sua sessão expirou"
**Verification:**
- [ ] Tests pass: `npm test`
**Dependencies:** Task 9
**Files likely touched:** `src/auth/AuthContext.jsx`, `src/auth/RotaProtegida.jsx`, `src/App.jsx`,
`src/main.jsx`, `src/pages/Login.jsx` (+ testes)
**Estimated scope:** M

#### Task 11: Menu, topo e limpeza do Painel; lint bloqueante
**Description:** `Sidebar` e `Topbar` leem do contexto e da matriz (nome, perfil, botão Sair);
itens sem tela saem do menu; remover do `PainelPrincipal` a chamada morta a `/api/dados` e as
leituras soltas de `localStorage`; corrigir os erros de lint e tirar o `continue-on-error`.
**Acceptance criteria:**
- [ ] Cada perfil vê exatamente os itens da tabela da spec
- [ ] `npm run lint` sem erros; CI com lint bloqueante
- [ ] Nenhum `localStorage` fora do `AuthContext`; nenhuma URL de API fixa no código
**Verification:**
- [ ] Tests pass: `npm test && npm run lint && npm run build`
**Dependencies:** Task 10
**Files likely touched:** `src/components/Sidebar.jsx`, `src/components/Topbar.jsx`,
`src/pages/PainelPrincipal.jsx`, `.github/workflows/ci.yml`
**Estimated scope:** M

### Checkpoint: Sessão no frontend
- [ ] Login, menu e logout funcionam localmente contra o backend local, para os 4 perfis

#### Task 12: Meu perfil
**Description:** Tela de troca da própria senha, com confirmação e mensagens de erro do backend.
**Acceptance criteria:**
- [ ] Sucesso mostra confirmação; senha atual errada mostra o erro do backend
**Verification:**
- [ ] Tests pass: `npm test`
**Dependencies:** Task 11
**Files likely touched:** `src/pages/MeuPerfil.jsx`, `src/App.jsx`, CSS (+ teste)
**Estimated scope:** S

#### Task 13: Tela de Usuários (ADMIN)
**Description:** Lista com perfil e situação; criar, editar, ativar/desativar e redefinir
senha; mensagens de erro do backend (e-mail duplicado, último ADMIN).
**Acceptance criteria:**
- [ ] As 5 operações funcionam e a lista se atualiza sem recarregar a página
- [ ] O erro 409 do último ADMIN aparece com a mensagem do backend
**Verification:**
- [ ] Tests pass: `npm test`
**Dependencies:** Task 11
**Files likely touched:** `src/pages/Usuarios.jsx`, `src/components/UsuarioForm.jsx`, `src/App.jsx`, CSS (+ teste)
**Estimated scope:** M

### Phase 3: Fechamento

#### Task 14: Verificação ponta a ponta, documentação e revisão
**Description:** Script Playwright local (backend + frontend + Mongo em container) que loga
com cada perfil e confere o menu e o redirecionamento; atualizar READMEs (endpoints, variáveis,
fluxo de login); revisão final com os agentes `code-reviewer`, `security-auditor` e
`test-engineer`; abrir o PR.
**Acceptance criteria:**
- [ ] O script passa para os 4 perfis
- [ ] READMEs listam as variáveis novas (`MONGODB_DATABASE`, `JWT_EXPIRACAO_HORAS`, `CORS_ORIGINS`, `DEMO_SENHA`)
- [ ] Achados críticos e obrigatórios das revisões resolvidos
**Verification:**
- [ ] Manual: saída do script e CI do PR verdes
**Dependencies:** Tasks 12, 13
**Files likely touched:** `backend/README.md`, `frontend/README.md`, `README.md`, `tasks/todo-identity.md`
**Estimated scope:** S

### Checkpoint: Marco 1 completo
- [ ] Todos os Success Criteria do SPEC-identity.md atendidos
- [ ] Guilherme atualiza as variáveis no Render (`MONGODB_DATABASE=ambydata_prod`,
      `CORS_ORIGINS` com a URL da Vercel, `JWT_SECRET` com 32+ caracteres, `DEMO_SENHA`) antes do merge

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Merge publica backend e frontend juntos, mas o Render demora a subir | Med | Atualizar as variáveis do Render antes do merge; janela curta de indisponibilidade aceitável no PI |
| `MONGODB_DATABASE=ambydata_prod` aponta para um banco vazio | Med | Esperado (dados descartáveis); o seed cria o ADMIN e os demos na primeira subida |
| springdoc 3.0.3 incompatível com algum detalhe do Boot 4.0.9 | Low | Task 8 isolada; teste de `/v3/api-docs` acusa na hora |
| Testcontainers exige Docker local para quem roda `./mvnw verify` | Low | README explica; o CI já tem Docker |
| Token em `localStorage` exposto a XSS | Med | Sem HTML injetado no app; cookies httpOnly ficam no Deferred da spec |

## Open Questions

- Nenhuma bloqueante. O arquivo `tasks/plan.md` ainda contém as Tasks 8 e 9 do Marco 0
  (deploys e proteção da `main`), por isso este plano está em `tasks/plan-identity.md`.
