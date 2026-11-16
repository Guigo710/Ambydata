# AmbyData — Backend

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0.9-brightgreen)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![License](https://img.shields.io/badge/license-uso%20pessoal%2Facad%C3%AAmico-lightgrey)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)

Backend do **AmbyData**, um dashboard de monitoramento industrial. Esta pasta contém a API desenvolvida em Java e Spring Boot. O frontend está em [`../frontend`](../frontend), no mesmo monorepo; o [README da raiz](../README.md) explica como rodar os dois.

## Stack

- Java 21
- Spring Boot 4.0.9
- Spring Web MVC
- Spring Data MongoDB
- Spring Security
- BCrypt para hash de senhas
- JJWT — token de sessão JWT (HS256)
- Testcontainers — MongoDB descartável nos testes
- Lombok
- Maven Wrapper
- Docker

## Pré-requisitos

- JDK 21 ou superior
- Instância MongoDB acessível pela aplicação, como MongoDB Atlas ou MongoDB local
- Docker, opcional

## Instalação e execução

Clone o monorepo e entre na pasta do backend:

```bash
git clone https://github.com/Guigo710/Ambydata.git
cd Ambydata/backend
```

### Configuração

A aplicação lê a URI do MongoDB pela variável de ambiente `MONGODB_URI`. O banco vem de `MONGODB_DATABASE` (padrão `ambydata_dev`), e a coleção de usuários é `usuario`.

`JWT_SECRET` é obrigatória e precisa ter pelo menos 32 caracteres: sem ela, ou com menos, a aplicação não sobe. `JWT_EXPIRACAO_HORAS` define a validade do token (padrão 8 horas). `CORS_ORIGINS` lista as origens do frontend (padrão `http://localhost:5173`).

Configure as variáveis no terminal que iniciará o backend. Não coloque credenciais no GitHub.

No PowerShell:

```powershell
$env:MONGODB_URI = "mongodb+srv://<usuario>:<senha>@<cluster>/?retryWrites=true&w=majority"
$env:JWT_SECRET = "<segredo-local>"
```

No Bash:

```bash
export MONGODB_URI="mongodb+srv://<usuario>:<senha>@<cluster>/?retryWrites=true&w=majority"
export JWT_SECRET="<segredo-local>"
```

Substitua os valores de exemplo pelos dados do seu ambiente. Um arquivo `.env` local é ignorado pelo Git, mas o Spring Boot não carrega automaticamente esse arquivo sem configuração adicional.

### Executando a aplicação

Com o Maven Wrapper:

```bash
./mvnw spring-boot:run
```

No Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

A API fica disponível em `http://localhost:8080`.

### Executando os testes

```bash
./mvnw test
```

No Windows:

```powershell
.\mvnw.cmd test
```

Os testes sobem um MongoDB descartável com Testcontainers: basta ter o Docker rodando, sem `MONGODB_URI`.

### Executando com Docker

Construa a imagem:

```bash
docker build -t ambydata-backend .
```

Inicie o container, informando as variáveis de ambiente:

```bash
docker run --rm -p 8080:8080 \
  -e MONGODB_URI="mongodb+srv://<usuario>:<senha>@<cluster>/?retryWrites=true&w=majority" \
  -e JWT_SECRET="<segredo-local>" \
  ambydata-backend
```

No PowerShell, o comando pode ser escrito assim:

```powershell
docker run --rm -p 8080:8080 `
  -e "MONGODB_URI=mongodb+srv://<usuario>:<senha>@<cluster>/?retryWrites=true&w=majority" `
  -e "JWT_SECRET=<segredo-local>" `
  ambydata-backend
```

Não publique credenciais reais em comandos, capturas de tela ou arquivos versionados.

## Banco de dados

O backend atual usa **MongoDB**, não MySQL nem JPA.

- URI: variável de ambiente `MONGODB_URI`
- Banco: variável `MONGODB_DATABASE` (padrão `ambydata_dev`; no deploy, `ambydata_prod`)
- Coleção de usuários: `usuario`

## Endpoints implementados

O contrato completo está em [`SPEC-identity.md`](../SPEC-identity.md#contrato-da-api).

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| POST | `/api/auth/login` | público | Recebe `{ email, senha }` e devolve `{ token, expiraEm, usuario }` |
| GET | `/api/auth/me` | autenticado | Dados do usuário do token |

Envie o token em toda requisição autenticada:

```http
Authorization: Bearer <token>
```

Erros saem sempre no mesmo formato:

```json
{ "status": 400, "erro": "Dados inválidos.", "campos": { "email": "must not be blank" } }
```

## Autenticação e segurança

- A API nega por padrão: toda rota precisa de uma regra explícita em `config/SecurityConfig.java`.
- O login recusa e-mail inexistente, senha errada e usuário inativo com a mesma mensagem
  ("E-mail ou senha incorretos."), para não revelar quais e-mails existem.
- A cada requisição o usuário é recarregado do banco: desativar alguém ou mudar o perfil vale
  na hora, mesmo com o token ainda válido.
- Sem token, ou com token inválido ou expirado: 401. Com token de um perfil sem permissão: 403.
- CORS: só as origens de `CORS_ORIGINS` (padrão `http://localhost:5173`, separadas por vírgula).
- Senhas guardadas com BCrypt; o hash nunca sai em nenhuma resposta.

## Métricas

A rota antiga `/api/dados` não está implementada na versão atual: o controller e o repositório de métricas estão comentados. A configuração atual do backend não usa MySQL/JPA.

## Estrutura do projeto

```text
src/
  main/
    java/com/ambydata/ambydata_backend/
      auth/         # Login, /me e JWT (emissão, validação e filtro)
      usuario/      # Usuario, Perfil, repositório e regras
      config/       # Segurança, CORS, erros padrão, PasswordEncoder, seed
      migracao/     # Migrações versionadas do banco (coleção migracao)
      controller/, model/, repository/  # Métricas antigas (código morto, sai no Marco 1)
    resources/
      application.yml
  test/
pom.xml
Dockerfile
mvnw
mvnw.cmd
```

## Roadmap

- [x] Implementar emissão e validação de JWT
- [x] Proteger a listagem de usuários e revisar o acesso às demais rotas
- [ ] Adicionar testes para cadastro e autenticação (autenticação feita; cadastro vem com a gestão de usuários)
- [ ] Documentar a API com OpenAPI/Swagger
- [x] Configurar CI para build e testes (`.github/workflows/ci.yml` na raiz)

## Licença

Projeto de uso pessoal/acadêmico. Não distribuído sob licença open source.