# Todo: identity (Marco 1)

Source spec: SPEC-identity.md — detalhes em tasks/plan-identity.md

## Phase 1: Backend
- [x] Task 1: Testes com Testcontainers e banco configurável (M)
- [x] Task 2: Perfil, entidade Usuario e executor de migrações (M)
- [x] Task 3: Emissão e validação do JWT (S)
- [x] Task 4: Login, /me e segurança negar-por-padrão (M)

### Checkpoint: Login
- [x] `./mvnw -B verify` verde
- [x] Login + `/api/auth/me` funcionam localmente

- [ ] Task 5: Troca da própria senha (S)
- [ ] Task 6: Gestão de usuários pelo ADMIN (M)
- [ ] Task 7: Seed do ADMIN e dos demos; remoção do código morto (S)
- [ ] Task 8: Swagger (S)

### Checkpoint: Backend completo
- [ ] Critérios 1–5, 9 e 10 cobertos por teste
- [ ] Revisão com o agente security-auditor

## Phase 2: Frontend
- [ ] Task 9: Infra de testes, cliente da API e matriz de permissões (M)
- [ ] Task 10: AuthContext, rotas protegidas e tela de login (M)
- [ ] Task 11: Menu, topo e limpeza do Painel; lint bloqueante (M)

### Checkpoint: Sessão no frontend
- [ ] Login, menu e logout funcionam para os 4 perfis

- [ ] Task 12: Meu perfil (S)
- [ ] Task 13: Tela de Usuários (ADMIN) (M)

## Phase 3: Fechamento
- [ ] Task 14: Verificação ponta a ponta, documentação e revisão (S)

### Checkpoint: Marco 1 completo
- [ ] Success Criteria do SPEC-identity.md atendidos
- [ ] Variáveis do Render atualizadas antes do merge
