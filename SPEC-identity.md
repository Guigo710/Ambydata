# Spec: identity — V1

Status: proposto
Módulo: `identity` (Marco 1) — ver CAPABILITY-MAP.md
Depende de: `monorepo` (concluído)
Fonte: documento "AmbyData — Decisões do Projeto", seções "Perfis e matriz de telas", "Backend" e "Frontend"

## Objective

Dar ao AmbyData autenticação real e controle de acesso por perfil. Hoje o login só confere a
senha uma vez: não há token, qualquer pessoa chama a API, o cadastro de usuários é
inacessível e o frontend lê o perfil de um campo que não existe (`cargo.nomeCargo`), então todo
mundo vira OPERARIO no menu.

Ao final deste módulo:

- Cada pessoa entra com e-mail e senha e recebe um token JWT; toda chamada à API exige esse
  token, exceto o login e a documentação.
- Existem 4 perfis: `OPERARIO`, `ENGENHEIRO`, `DIRETOR` e `ADMIN`. As permissões valem no
  backend, não só no menu.
- O ADMIN cadastra, edita, ativa/desativa e redefine a senha dos usuários. Ninguém se cadastra
  sozinho, e o ADMIN não vê telas de produção.
- Todo usuário troca a própria senha em "Meu perfil". "Esqueci minha senha" mostra
  "Procure seu gestor".
- A API tem contrato documentado em Swagger (`/swagger-ui`), usado como referência pelo
  frontend.

Usuários: os 4 perfis da fábrica fictícia; nesta versão, só o ADMIN tem tela própria além do
que já existe (Painel e Status da Máquina continuam com dados estáticos até o módulo
`indicadores`).

## Tech Stack

- Backend: Java 21, Spring Boot 4.0.9, Spring Security, Spring Data MongoDB, JJWT 0.12.6
  (já no pom), Bean Validation, Lombok.
- Novas dependências do backend (aprovar): `springdoc-openapi` (Swagger), Testcontainers
  com módulo MongoDB (testes), Mongock (migrações) — ver Open Questions sobre compatibilidade.
- Frontend: React 19, Vite 8, React Router 7, Axios.
- Novas dependências do frontend (aprovar): `@tanstack/react-query` (busca de dados),
  `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` (testes).

## Commands

```
# Backend (backend/)
./mvnw -B verify                    # testes com Testcontainers (precisa de Docker)
./mvnw spring-boot:run              # dev em http://localhost:8080, Swagger em /swagger-ui

# Frontend (frontend/)
npm ci
npm run lint                        # passa a ser bloqueante no CI
npm test                            # vitest run
npm run build
npm run dev                         # http://localhost:5173
```

Variáveis de ambiente do backend:

| Variável | Obrigatória | Uso |
|---|---|---|
| `MONGODB_URI` | sim | conexão com o cluster |
| `MONGODB_DATABASE` | não (padrão `ambydata_dev`) | `ambydata_dev` local, `ambydata_prod` no Render |
| `JWT_SECRET` | sim, 32+ caracteres | assinatura HS256; a aplicação não sobe com menos |
| `JWT_EXPIRACAO_HORAS` | não (padrão 8) | validade do token: um turno |
| `CORS_ORIGINS` | não (padrão `http://localhost:5173`) | origens do frontend, separadas por vírgula |
| `ADMIN_EMAIL`, `ADMIN_SENHA`, `ADMIN_NOME` | não | cria o primeiro ADMIN se ainda não existir |
| `DEMO_SENHA` | não | se definida, cria 1 usuário de demonstração por perfil |

## Project Structure

```
backend/src/main/java/com/ambydata/ambydata_backend/
  auth/            login, /me, troca da própria senha, JWT (emissão e filtro)
  usuario/         entidade Usuario, enum Perfil, repositório, service, gestão pelo ADMIN
  config/          SecurityConfig, CORS, OpenAPI, tratamento global de erros
  migracao/        migrações versionadas (perfil, índices, seed)
backend/src/test/java/com/ambydata/ambydata_backend/
  auth/  usuario/  testes de integração com Testcontainers + MockMvc

frontend/src/
  services/api.js            cliente axios único, interceptors de token e 401
  auth/AuthContext.jsx       sessão: usuário, perfil, login, logout
  auth/RotaProtegida.jsx     bloqueia rotas por perfil
  auth/permissoes.js         matriz perfil → telas (usada pelo menu e pelas rotas)
  pages/Login.jsx            (movido de components/)
  pages/Usuarios.jsx         gestão de usuários (ADMIN)
  pages/MeuPerfil.jsx        troca da própria senha
  components/Sidebar.jsx, Topbar.jsx   leem do AuthContext
frontend/src/**/*.test.jsx   testes ao lado do código
```

## Contrato da API

Erro padrão em qualquer endpoint:

```json
{ "status": 400, "erro": "E-mail já cadastrado.", "campos": { "email": "já cadastrado" } }
```

| Método e rota | Quem | Entrada | Resposta |
|---|---|---|---|
| `POST /api/auth/login` | público | `{ email, senha }` | 200 `{ token, expiraEm, usuario }`; 401 "E-mail ou senha incorretos." (mesma mensagem para usuário inativo) |
| `GET /api/auth/me` | autenticado | — | 200 `usuario` |
| `PUT /api/auth/me/senha` | autenticado | `{ senhaAtual, novaSenha }` | 204; 400 se a senha atual não confere |
| `GET /api/usuarios` | ADMIN | — | 200 lista de `usuario` |
| `POST /api/usuarios` | ADMIN | `{ nome, email, senha, perfil }` | 201 `usuario`; 400 e-mail duplicado ou perfil inválido |
| `PUT /api/usuarios/{id}` | ADMIN | `{ nome, email, perfil }` | 200 `usuario` |
| `PATCH /api/usuarios/{id}/ativo` | ADMIN | `{ ativo }` | 200 `usuario` |
| `PUT /api/usuarios/{id}/senha` | ADMIN | `{ novaSenha }` | 204 |

`usuario` = `{ id, nome, email, perfil, ativo }`; nunca expõe o hash da senha.

Regras:

- Senha com no mínimo 8 caracteres; e-mail normalizado (minúsculas, sem espaços) e único.
- A cada requisição, o filtro do JWT recarrega o usuário: desativar alguém ou mudar o perfil
  vale na hora, sem esperar o token expirar.
- O ADMIN não pode desativar a si mesmo nem rebaixar/desativar o último ADMIN ativo (409).
- Rotas antigas `POST /api/usuarios/login` e o `GET /api/usuarios` público deixam de existir.

## Telas por perfil neste módulo

| Tela | OPERARIO | ENGENHEIRO | DIRETOR | ADMIN |
|---|---|---|---|---|
| Painel principal (dados estáticos) | ✅ | ✅ | ✅ | — |
| Status da Máquina (dados estáticos) | ✅ | ✅ | ✅ | — |
| Usuários | — | — | — | ✏️ |
| Meu perfil | ✏️ | ✏️ | ✏️ | ✏️ |

Os itens do menu sem tela (OEE, Manutenção, Custos, Produtividade, Parâmetros com IA,
Configurações) saem do menu. Depois do login, o ADMIN vai para `/usuarios` e os demais para
`/painel`. Rota sem permissão redireciona para a tela inicial do perfil; sem sessão, para o
login.

## Code Style

Backend — DTO como `record` validado, controller fino, regra no service:

```java
// Entrada da criação de usuário pelo ADMIN. A entidade Usuario nunca é recebida direto.
public record CriarUsuarioRequest(
        @NotBlank String nome,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String senha,
        @NotNull Perfil perfil) {}

@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public UsuarioResponse criar(@Valid @RequestBody CriarUsuarioRequest request) {
    return UsuarioResponse.de(usuarioService.criar(request));
}
```

Frontend — chamadas só pelo cliente único, sessão só pelo contexto:

```jsx
export default function Usuarios() {
  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => api.get("/api/usuarios").then((r) => r.data),
  });
  // ...
}
```

Convenções: domínio em português (`Usuario`, `Perfil`, `trocarSenha`), termos do framework em
inglês; comentários só para explicar pasta/módulo ou bloco não óbvio; sem `style={{...}}` novo
(classes CSS); commits `feat(identity): ...`.

## Testing Strategy

- Backend: testes de integração com `@SpringBootTest` + MockMvc contra MongoDB do
  Testcontainers (`@ServiceConnection`). O CI deixa de usar o serviço `mongo` do workflow.
  Casos mínimos: login válido/inválido/inativo; token ausente, inválido e expirado (401);
  matriz de permissão (cada perfil × cada rota de `/api/usuarios`, 403 para não-ADMIN);
  regras do último ADMIN; troca e redefinição de senha; e-mail duplicado; JWT_SECRET curto
  impede a subida.
- Frontend: Vitest + Testing Library para `AuthContext`, `RotaProtegida`, a matriz de
  `permissoes.js` e o formulário de login (sucesso, 401, servidor fora).
- Lint do frontend passa a ser bloqueante no CI.
- Verificação manual no deploy: login com cada perfil de demonstração e conferência do menu.

## Boundaries

- Always: validar toda entrada com Bean Validation; testar a permissão de cada rota nova;
  manter o contrato do Swagger igual ao código; rodar `./mvnw verify` e `npm test && npm run
  lint && npm run build` antes de cada commit.
- Ask first: qualquer dependência além das listadas em Tech Stack; mudar o formato do erro
  padrão; mudar a validade do token; mexer nas telas Painel/Status além de trocar a origem do
  usuário logado.
- Never: logar senha, hash ou token; devolver `senhaHash` em qualquer resposta; commitar
  segredos ou senhas de demonstração; deixar uma rota de `/api/**` sem regra explícita
  (o padrão é negar).

## Success Criteria

1. `POST /api/auth/login` com credenciais válidas devolve um JWT HS256 que expira em
   `JWT_EXPIRACAO_HORAS`; com senha errada ou usuário inativo devolve 401 com a mesma mensagem.
2. Qualquer rota de `/api/**` exceto login e Swagger responde 401 sem token e 403 com token
   de perfil sem permissão; os testes cobrem os 4 perfis × as rotas de usuários.
3. Desativar um usuário faz a próxima requisição dele responder 401, com o token ainda válido.
4. O ADMIN cria, edita, ativa/desativa e redefine senha pela tela Usuários; não consegue
   desativar a si mesmo nem o último ADMIN ativo.
5. Todo perfil troca a própria senha em Meu perfil; a senha antiga deixa de funcionar.
6. O frontend mostra o nome e o perfil corretos no topo e só os itens de menu da tabela acima;
   acessar `/usuarios` como OPERARIO redireciona para `/painel`.
7. Token expirado ou recusado (401) leva ao login com a mensagem "Sua sessão expirou".
8. O frontend não tem URL de API fixa: tudo usa `VITE_API_URL` pelo `services/api.js`; a
   chamada morta a `/api/dados` no Painel é removida.
9. `/swagger-ui` lista todos os endpoints da tabela de contrato com os esquemas de entrada e
   saída.
10. A migração converte `cargo` → `perfil` em documentos existentes, cria o índice único de
    e-mail e roda uma única vez; o banco usa `MONGODB_DATABASE`.
11. CI verde com os testes novos e o lint bloqueante; `ci.yml` sem o serviço `mongo`.

## Out of Scope (Deferred)

- Recuperação de senha por e-mail: exige serviço de envio; o ADMIN redefine.
- Forçar troca de senha no primeiro login após redefinição: útil, mas não pedido; V2.
- Limite de tentativas de login (rate limit): V2 do módulo, antes de um uso real.
- Refresh token e "manter conectado": o token de 8h cobre um turno.
- Token em cookie httpOnly: front e back em domínios diferentes; reavaliar se houver domínio próprio.
- Campos `setor` e `turno` no usuário (documento do PI): chegam com `fabrica` e `chao-de-fabrica`.
- Telas das demais rotas do menu: cada uma no seu módulo.

## Open Questions

1. **Mongock com Spring Boot 4:** a compatibilidade precisa ser confirmada na documentação
   antes do plano. Se não houver versão estável compatível, a recomendação é um executor
   próprio e pequeno (um `ApplicationRunner` que grava as migrações aplicadas numa coleção
   `migracao`), sem dependência nova.
2. **Validade do token de 8 horas** (um turno): confirma, ou prefere outro valor?
3. **Swagger público em produção:** recomendo deixar aberto, porque só documenta e ajuda na
   banca. Se preferir, fica restrito ao perfil local.
4. **Usuários de demonstração** (`DEMO_SENHA`): e-mails `operario@ambydata.demo`,
   `engenheiro@ambydata.demo`, `diretor@ambydata.demo`, todos com a senha de `DEMO_SENHA`.
   Ok ou prefere outro padrão?
