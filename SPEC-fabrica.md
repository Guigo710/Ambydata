# Spec: fabrica — V1

Status: aprovado
Módulo: `fabrica` (Marco 2, PR 1 de 3, junto com `simulacao`) — ver CAPABILITY-MAP.md
Depende de: `identity`

## Objective

Dar ao AmbyData um cadastro de máquinas: hoje nenhuma tela diz de qual máquina vêm os dados.
Ao final deste módulo:

- Existem as máquinas de uma fábrica alimentícia fictícia (2 linhas, 6 máquinas), cada uma com
  setor, linha e os parâmetros de referência que os indicadores e os alertas usam.
- O ENGENHEIRO cadastra, edita e ativa/desativa máquinas numa tela "Máquinas", e é ele quem
  configura os parâmetros e os limites de alerta de cada máquina (ao criar ou editar). O DIRETOR vê a
  lista. ADMIN e OPERARIO não acessam essa tela.
- Toda tela de produção (Painel, Status da Máquina, OEE, Produtividade, Report de Manutenção)
  tem uma lista suspensa de máquinas ao lado do título. A escolha fica na URL
  (`?maquina=<id>`), então sobrevive à troca de tela e ao recarregar a página.

## Modelo

| Campo | Exemplo | Uso |
|---|---|---|
| `nome` | Envasadora 04 | identificação (único) |
| `tipo` | ENVASADORA | ícone e agrupamento |
| `setor` | Envase | filtros, cards de chamado |
| `linha` | Linha B | filtros |
| `cadenciaIdeal` | 60 peças/min | Performance do OEE |
| `faixaTemperatura` | `{ min: 0, max: 10 }` °C | faixa permitida: fora dela é alerta |
| `alertas.percentualCritico` | 50 (%) | crítico quando a temperatura sai da faixa em mais que esse % da largura dela (ex.: faixa 0–10 °C e 50% → crítico acima de 15 °C ou abaixo de −5 °C) |
| `alertas.minutosParadoMax` | 15 min | parada sem justificativa, em turno, além disso é crítica |
| `alertas.taxaDefeitosMax` | 8 (%) | defeitos na última hora além disso é crítico |
| `custoHora` | 120,00 R$ | custos |
| `valorPorPeca` | 2,50 R$ | lucro |
| `energia.potenciaKw` | 11 kW | potência ativa operando: consumo de energia |
| `energia.potenciaRegeneradaKw` | 3 kW (0 = não regenera) | potência devolvida à rede pela frenagem regenerativa |
| `energia.percentualRegeneracao` | 15 (% do tempo operando) | tempo em que a máquina regenera |
| `turnoPlanejado` | `{ inicio: "06:00", fim: "22:00" }` | Disponibilidade do OEE |
| `ativa` | true | máquinas inativas não geram leituras nem aparecem nas listas de produção |

Não há exclusão: desativar preserva o histórico de leituras e chamados.

Parâmetros de energia (adendo do PR 2, ver SPEC-indicadores "Custo de energia"): o ENGENHEIRO
informa ao criar ou editar a máquina; potência ativa de 0,1 a 10.000 kW, potência regenerada de
0 até a ativa, percentual de 0 a 100. A migração 003 preenche as 6 máquinas iniciais.

Seed (migração 002): Linha A — Misturadora 01 (Preparo), Forno 02 (Cozimento),
Resfriador 03 (Resfriamento); Linha B — Envasadora 04 (Envase), Seladora 05 (Embalagem),
Rotuladora 06 (Embalagem). Os parâmetros variam por tipo (o forno trabalha a ~180 °C, o
resfriador a 2–8 °C).

## Contrato da API

| Método e rota | Quem | Resposta |
|---|---|---|
| `GET /api/maquinas?ativas=true` | OPERARIO, ENGENHEIRO, DIRETOR | lista ordenada por linha e nome |
| `GET /api/maquinas/{id}` | OPERARIO, ENGENHEIRO, DIRETOR | máquina |
| `POST /api/maquinas` | ENGENHEIRO | 201 máquina; 400 nome duplicado, faixa inválida (min ≥ max) ou percentual crítico fora de 1–500% |
| `PUT /api/maquinas/{id}` | ENGENHEIRO | 200 máquina |
| `PATCH /api/maquinas/{id}/ativa` | ENGENHEIRO | 200 máquina |

ADMIN recebe 403 em todas (decisão: ADMIN não vê produção).

## Telas

| Tela | OPERARIO | ENGENHEIRO | DIRETOR | ADMIN |
|---|---|---|---|---|
| Máquinas (lista + formulário) | — | ✏️ | ✅ | — |

Componente `SeletorMaquina`: lista suspensa agrupada por linha, com a cor do status atual de
cada máquina (vem do módulo `indicadores`; até lá, sem cor). No Painel principal a primeira
opção é "Todas as máquinas".

## Success Criteria

1. A migração 002 cria as 6 máquinas uma única vez; rodar de novo não duplica.
2. As 4 regras de acesso da tabela acima valem no backend (teste por perfil × rota).
3. O ENGENHEIRO cria, edita e desativa uma máquina pela tela; nome duplicado e faixa inválida
   mostram a mensagem do backend.
4. O seletor aparece ao lado do título nas 5 telas de produção, lista só máquinas ativas e
   mantém a escolha na URL ao trocar de tela e ao recarregar.

## Boundaries

- Always: validar faixas e limites no backend; nunca apagar máquina.
- Ask first: novos campos além da tabela; mudar a lista do seed.
- Never: expor rotas de máquina ao ADMIN.

## Out of Scope (Deferred)

- Layout visual dos setores (RF10) → módulo `relatorios`.
- Parâmetros operacionais editáveis pelo operário (RF05) → `chao-de-fabrica`.
- Fotos e manuais da máquina (RF04).
