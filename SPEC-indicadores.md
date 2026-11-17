# Spec: indicadores — V1

Status: aprovado
Módulo: `indicadores` (Marco 2, PR 2 de 3) — ver CAPABILITY-MAP.md
Depende de: `fabrica`, `simulacao`

## Objective

Trocar os gráficos estáticos por dados das máquinas e deixar claro, em cada tela, **qual
máquina**, **qual parâmetro**, **de onde vem** e **como é calculado**. Hoje o usuário não sabe
o que está vendo.

## Telas

Todas com o seletor de máquina ao lado do título (`fabrica`) e um bloco "Sobre estes dados"
com: fonte (Simulador ou Dispositivo), frequência (a cada 10 s), última leitura ("há 8 s") e a
fórmula usada. Atualizam sozinhas a cada 10 s.

| Tela | O que mostra | Perfis |
|---|---|---|
| **Painel principal** | "Todas as máquinas": cards por máquina (status, OEE da hora, temperatura, alerta) agrupados por linha. Uma máquina: o resumo dela (os 4 números abaixo) | OPERARIO, ENGENHEIRO, DIRETOR |
| **Status da Máquina** | status atual (Operando/Parada/Fora do turno), temperatura atual × faixa permitida (aviso amarelo fora da faixa, vermelho acima do limite crítico), gráfico das últimas 2 h com a faixa e o limite crítico desenhados, peças na última hora, paradas do turno | OPERARIO, ENGENHEIRO, DIRETOR |
| **OEE em tempo real** | OEE da última hora e do turno, decomposto em Disponibilidade, Performance e Qualidade, cada um com a fórmula e os números usados; gráfico das últimas 24 h. Para ENGENHEIRO e DIRETOR, também MTBF e downtime | OPERARIO, ENGENHEIRO, DIRETOR |
| **Produtividade** | peças/h e peças boas × defeituosas por máquina; comparativo por setor e por linha nas últimas 24 h e 7 dias | OPERARIO, ENGENHEIRO, DIRETOR |
| **Custos e Lucros** | custo, receita e lucro por máquina e por linha (24 h, 7 dias) | DIRETOR |

## Fórmulas (mostradas na interface)

- Disponibilidade = tempo operando ÷ tempo planejado do turno
- Performance = peças produzidas ÷ (cadência ideal × tempo operando)
- Qualidade = peças boas ÷ peças produzidas
- OEE = Disponibilidade × Performance × Qualidade
- MTBF = tempo operando ÷ número de paradas; Downtime = minutos parados no turno
- Lucro = peças boas × valor por peça − custo-hora × horas do turno

## Contrato da API

| Método e rota | Quem |
|---|---|
| `GET /api/indicadores/resumo` (todas as máquinas: status, OEE da hora, temperatura, última leitura) | produção |
| `GET /api/indicadores/maquinas/{id}/agora` | produção |
| `GET /api/indicadores/maquinas/{id}/historico?horas=24` (agregados horários) | produção |
| `GET /api/indicadores/leituras/{id}?minutos=120` (leituras brutas para o gráfico de temperatura) | produção |
| `GET /api/indicadores/comparativo?periodo=24h\|7d&por=setor\|linha\|maquina` | produção |
| `GET /api/indicadores/financeiro?periodo=24h\|7d` | DIRETOR |

## Success Criteria

1. Os cálculos de D, P, Q, OEE, MTBF e lucro batem com valores calculados à mão em testes.
2. Cada tela mostra máquina, fonte, última leitura e fórmula; nenhum dado de exemplo sobra.
3. As permissões da tabela valem no backend e no menu.
4. Trocar a máquina no seletor atualiza a tela sem recarregar; a tela se atualiza sozinha.
5. O Forno 02 aparece fora da faixa no Status da Máquina em algum momento do ciclo simulado.

## Custo de energia (adendo aprovado durante o PR 2)

Painel **Energia**, só para ENGENHEIRO e DIRETOR, com o balanço de cada máquina, de cada linha e
da fábrica em 24 h ou 7 dias. Fórmula pedida (custo líquido = entrada − injetado + encargos):

- Consumo (kWh) = potência ativa (kW) × tempo operando (h)
- Custo de entrada (R$) = consumo (kWh) × tarifa cheia (TE + TUSD, R$/kWh)
- Energia injetada (kWh) = potência regenerada (kW) × tempo de regeneração (h), com
  tempo de regeneração = tempo operando × percentual de regeneração da máquina
- Valor injetado (R$) = energia injetada (kWh) × tarifa compensável (R$/kWh)
- Encargos/demanda (R$) = demanda contratada (kW) × tarifa de demanda (R$/kW·mês) × horas do
  período ÷ 720 (proporcional ao mês); entram só no total da fábrica, que é quem contrata
- Custo líquido (R$) = custo de entrada − valor injetado (+ encargos/demanda no total)

Exemplo (Envasadora 04, 15 h operando, tarifa cheia R$ 0,85, compensável R$ 0,55): 11 kW × 15 h =
165 kWh → R$ 140,25; 3 kW × (15 h × 15%) = 6,75 kWh → R$ 3,71; líquido R$ 136,54.

Parâmetros: potência e regeneração ficam na máquina (`fabrica`); as tarifas e a demanda são uma
configuração única da fábrica, que o ENGENHEIRO ajusta no próprio painel e o DIRETOR só vê.
O custo de energia é **informativo**: o lucro continua com a fórmula de Custos e Lucros.

| Método e rota | Quem |
|---|---|
| `GET /api/indicadores/energia?periodo=24h\|7d` | ENGENHEIRO, DIRETOR |
| `GET /api/energia/tarifas` | ENGENHEIRO, DIRETOR |
| `PUT /api/energia/tarifas` (`tarifaCheia`, `tarifaCompensavel`, `demandaContratadaKw`, `tarifaDemanda`) | ENGENHEIRO |

Critérios: as contas batem com valores calculados à mão em testes; OPERARIO e ADMIN recebem 403
e não veem o painel; o DIRETOR vê as tarifas mas não edita.

Fora do escopo agora: horário de ponta e fora de ponta (Grupo A) e energia medida pelo
dispositivo (Marco 6: o ESP32 poderá mandar kWh medido no lugar de potência × tempo).

## Out of Scope (Deferred)

- Relatórios exportáveis e layout dos setores → `relatorios`.
- Metas de produção por turno → `chao-de-fabrica`.
