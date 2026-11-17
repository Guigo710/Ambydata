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

`JWT_SECRET` é obrigatória e precisa ter pelo menos 32 caracteres: sem ela, ou com menos, a aplicação não sobe. Use um valor aleatório, nunca uma frase (`openssl rand -base64 48`), e um diferente em cada ambiente: quem descobre o segredo consegue forjar o token de qualquer usuário. `JWT_EXPIRACAO_HORAS` define a validade do token (padrão 8 horas). `CORS_ORIGINS` lista as origens do frontend (padrão `http://localhost:5173`).

Usuários criados na subida (quem já existe, pelo e-mail, não é alterado):

- `ADMIN_EMAIL`, `ADMIN_SENHA` e `ADMIN_NOME` (opcional): o primeiro ADMIN.
- `DEMO_SENHA`: se definida, cria `operario@ambydata.demo`, `engenheiro@ambydata.demo` e
  `diretor@ambydata.demo` com essa senha, para demonstração.

Simulação e dispositivos:

- `SIMULADOR_ATIVO` (padrão `true`): gera uma leitura a cada 10 s por máquina ativa e, ao subir,
  preenche a última hora que faltar (o Render dorme sem tráfego). Use `false` para desligar.
- `DEVICE_KEY` (opcional): chave que um dispositivo real (ESP32) manda no cabeçalho
  `X-Device-Key` para `POST /api/leituras`. Sem ela, a rota recusa tudo (401). Gere com
  `openssl rand -base64 32`.

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
- Coleções: `usuario`, `maquina` (6 máquinas iniciais em 2 linhas, criadas pela migração
  `M002`), `leitura` (uma por máquina a cada 10 s, apagadas sozinhas após 48 h),
  `indicador_hora` (totais por máquina e hora, 90 dias), `configuracao_energia` e `migracao`

## Endpoints implementados

Com a aplicação rodando, a documentação interativa fica em
[`/swagger-ui`](http://localhost:8080/swagger-ui) (pública). Faça login em
`POST /api/auth/login`, copie o `token` e cole em **Authorize** para testar as demais rotas.
O contrato também está descrito em [`SPEC-identity.md`](../SPEC-identity.md#contrato-da-api).

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| POST | `/api/auth/login` | público | Recebe `{ email, senha }` e devolve `{ token, expiraEm, usuario }` |
| GET | `/api/auth/me` | autenticado | Dados do usuário do token |
| PUT | `/api/auth/me/senha` | autenticado | Recebe `{ senhaAtual, novaSenha }` (8 a 72 caracteres); 204 |
| GET | `/api/usuarios` | ADMIN | Lista os usuários, por nome |
| POST | `/api/usuarios` | ADMIN | Cria `{ nome, email, senha, perfil }`; 201 |
| PUT | `/api/usuarios/{id}` | ADMIN | Edita `{ nome, email, perfil }` |
| PATCH | `/api/usuarios/{id}/ativo` | ADMIN | Ativa ou desativa `{ ativo }` |
| PUT | `/api/usuarios/{id}/senha` | ADMIN | Redefine a senha `{ novaSenha }`; 204 |
| GET | `/api/maquinas` | OPERARIO, ENGENHEIRO, DIRETOR | Lista as máquinas por linha e nome; `?ativas=true` só as ativas |
| GET | `/api/maquinas/{id}` | OPERARIO, ENGENHEIRO, DIRETOR | Uma máquina, com o `limiteCritico` calculado |
| POST | `/api/maquinas` | ENGENHEIRO | Cria a máquina com parâmetros e alertas; 201 |
| PUT | `/api/maquinas/{id}` | ENGENHEIRO | Edita a máquina |
| PATCH | `/api/maquinas/{id}/ativa` | ENGENHEIRO | Ativa ou desativa `{ ativa }` |
| POST | `/api/leituras` | dispositivo (`X-Device-Key`) | Leitura de um sensor real; 201 |
| GET | `/api/indicadores/resumo` | OPERARIO, ENGENHEIRO, DIRETOR | Cada máquina ativa: última leitura (status, temperatura, situação NORMAL/ALERTA/CRITICO) e indicadores dos últimos 60 min |
| GET | `/api/indicadores/maquinas/{id}/agora` | OPERARIO, ENGENHEIRO, DIRETOR | Última leitura, última hora e turno atual (ou o último) |
| GET | `/api/indicadores/leituras/{id}?minutos=120` | OPERARIO, ENGENHEIRO, DIRETOR | Pontos do gráfico de temperatura (1 a 360 min) |
| GET | `/api/indicadores/maquinas/{id}/historico?horas=24` | OPERARIO, ENGENHEIRO, DIRETOR | Horas fechadas (1 a 168), lacunas como `semDados`, e o total |
| GET | `/api/indicadores/comparativo?periodo=24h\|7d&por=setor\|linha\|maquina` | OPERARIO, ENGENHEIRO, DIRETOR | Totais e indicadores por grupo |
| GET | `/api/indicadores/financeiro?periodo=24h\|7d` | DIRETOR | Custo, receita e lucro por máquina, linha e total |
| GET | `/api/indicadores/energia?periodo=24h\|7d` | ENGENHEIRO, DIRETOR | Consumo, energia injetada e custo líquido por máquina, linha e fábrica |
| GET | `/api/energia/tarifas` | ENGENHEIRO, DIRETOR | Tarifas de energia da fábrica |
| PUT | `/api/energia/tarifas` | ENGENHEIRO | Altera `{ tarifaCheia, tarifaCompensavel, demandaContratadaKw, tarifaDemanda }` |

Regras da gestão: e-mail único (400), o ADMIN não desativa a si mesmo e o sistema nunca fica
sem um ADMIN ativo (409).

Regras das máquinas: nome único sem diferenciar maiúsculas (400), temperatura mínima menor que
a máxima e turno com início diferente do fim. O limite crítico é a faixa permitida aumentada em
`alertas.percentualCritico`% da largura dela para os dois lados: faixa 0 a 10 °C com 50% vira
crítico abaixo de -5 °C ou acima de 15 °C. O contrato está em [`SPEC-fabrica.md`](../SPEC-fabrica.md)
e a simulação em [`SPEC-simulacao.md`](../SPEC-simulacao.md).

Envie o token em toda requisição autenticada:

```http
Authorization: Bearer <token>
```

Erros saem sempre no mesmo formato:

```json
{ "status": 400, "erro": "Dados inválidos.", "campos": { "email": "não deve estar em branco" } }
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

## Simulação

Sem placas instaladas, o backend imita a fábrica: cada máquina tem um cenário (saudável,
aquecimento, oscilação, paradas frequentes, defeitos altos) e o gerador é determinístico, ou
seja, o mesmo instante gera sempre a mesma leitura. Por isso preencher uma lacuna depois de o
servidor dormir dá o mesmo resultado que teria sido gravado na hora, sem duplicar. Uma máquina
que recebeu leitura de dispositivo nos últimos 5 minutos não é simulada.

## Indicadores

Fórmulas e telas em [`SPEC-indicadores.md`](../SPEC-indicadores.md). Como funcionam:

- **Agregados por hora** (`indicador_hora`, apagados após 90 dias): a cada hora fechada o backend
  grava os totais de cada máquina (tempo planejado, operando e parado, paradas, peças, temperatura).
  Na subida, preenche os últimos 7 dias que faltarem: hora com leitura de dispositivo usa as leituras
  gravadas; sem dispositivo, o gerador recalcula a hora (dá o mesmo que teria sido gravado, mesmo com
  o Render dormindo); com o simulador desligado, a hora fica como lacuna.
- **Agora** (última hora e turno): última hora sai das leituras brutas; o turno soma os agregados das
  horas fechadas com as leituras da hora corrente. Fora do turno, vale o último turno completo.
- Só conta tempo dentro do turno planejado. Uma parada que atravessa a virada da hora conta uma vez.
- **Energia** (informativa, não entra no lucro): consumo = potência × tempo operando; energia injetada
  = potência regenerada × tempo operando × % de regeneração; custo líquido = entrada − injetado +
  encargos de demanda (só no total da fábrica). Tarifas em `configuracao_energia`, ajustadas pelo
  ENGENHEIRO.

Migrações: `001` perfis e índices, `002` as 6 máquinas iniciais, `003` energia das máquinas iniciais e
tarifas padrão (não sobrescreve o que já foi ajustado).

## Estrutura do projeto

```text
src/
  main/
    java/com/ambydata/ambydata_backend/
      auth/         # Login, /me e JWT (emissão, validação e filtro)
      usuario/      # Usuario, Perfil, repositório e regras
      maquina/      # Máquinas, faixa de temperatura, limites de alerta e turno
      simulacao/    # Gerador de leituras, agendamento e ingestão de dispositivos
      indicadores/  # Cálculos, agregados por hora e a API /api/indicadores
      energia/      # Custo de energia e tarifas da fábrica
      config/       # Segurança, CORS, erros padrão, PasswordEncoder, usuários iniciais
      migracao/     # Migrações versionadas do banco (coleção migracao)
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
- [x] Adicionar testes para cadastro e autenticação
- [x] Documentar a API com OpenAPI/Swagger
- [x] Configurar CI para build e testes (`.github/workflows/ci.yml` na raiz)
- [x] Cadastro de máquinas e leituras simuladas
- [x] Indicadores: OEE, produtividade, custos e energia por máquina
- [ ] Chamados de manutenção em kanban, com abertura automática nos alertas críticos

## Licença

Projeto de uso pessoal/acadêmico. Não distribuído sob licença open source.