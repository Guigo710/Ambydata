# Spec: simulacao — V1

Status: aprovado
Módulo: `simulacao` (Marco 2, PR 1 de 3, junto com `fabrica`) — ver CAPABILITY-MAP.md
Depende de: `fabrica`

## Objective

Gerar dados fake que imitam um processo real, já que ainda não há sensores, e deixar pronta a
porta de entrada para o ESP32 do Marco 6. Os dados precisam contar histórias que a banca
consiga ver: uma máquina saudável, uma que esquenta aos poucos, uma que para muito e uma com
muitos defeitos.

## Como funciona

- **Leitura** (uma a cada 10 s por máquina ativa): `maquinaId`, `instante`, `status`
  (OPERANDO, PARADA), `temperatura` (°C), `pecasProduzidas`, `pecasBoas`, `segundosParado`,
  `origem` (SIMULADOR ou DISPOSITIVO).
- **Gerador determinístico:** a leitura de um instante é calculada a partir de
  (id da máquina, instante, cenário), com semente fixa. O mesmo instante gera sempre o mesmo
  valor. Assim, quando o Render acorda depois de dormir, o intervalo perdido é preenchido sem
  buracos e sem incoerência.
- **Cenários** (atribuídos no seed, um por máquina):

| Máquina | Cenário | O que se vê |
|---|---|---|
| Misturadora 01, Rotuladora 06 | saudável | OEE ~85%, temperatura estável |
| Forno 02 | aquece aos poucos | ciclo de ~2 h: sobe até passar do limite crítico, "volta da manutenção" |
| Envasadora 04 | paradas frequentes | Disponibilidade baixa, OEE ~55% |
| Seladora 05 | defeitos altos | Qualidade ~88% |
| Resfriador 03 | saudável com oscilação | temperatura perto do limite da faixa |

- **Fora do turno planejado** a máquina fica PARADA sem contar como downtime.
- **Agendamento:** um job alinhado ao relógio (a cada 10 s: :00, :10, :20...) grava a leitura
  do instante atual de cada máquina ativa. Na subida, preenche as leituras da última hora que
  faltarem; uma falha no preenchimento só é registrada em log, nunca impede a API de subir.
  Os agregados horários dos últimos 7 dias (e o preenchimento deles) chegam no PR 2, com
  `indicadores`: como o Render free dorme a noite toda, os indicadores tratam horas sem leitura
  como lacuna, não como máquina parada.
- **Retenção (Atlas free, 512 MB):** leituras brutas por 48 h (índice TTL); agregados por hora
  (`indicador_hora`) por 90 dias. Estimativa: < 20 MB.
- **Ingestão de dispositivos:** `POST /api/leituras` com o header `X-Device-Key` (variável
  `DEVICE_KEY`, 32+ caracteres; vazia desliga a rota), mesmo formato da leitura com
  `origem = DISPOSITIVO`. Uma máquina que recebe leitura de dispositivo deixa de ser simulada
  por 5 minutos. Regras da rota:
  - a chave é conferida antes de ler o corpo (sem chave: 401, nunca 400);
  - `instante` opcional, aceito só entre 5 min atrás e 30 s à frente (senão 400): um instante
    no futuro escaparia do TTL e desligaria o simulador; um no passado reescreveria o histórico;
  - no máximo uma leitura por máquina a cada 10 s; a segunda do mesmo bloco recebe 409 e não
    sobrescreve a primeira;
  - máquina inativa não recebe leitura (400); temperatura entre −100 e 1000 °C.
  - Marco 6 (ESP32): trocar a chave única por uma chave por dispositivo, guardada como hash e
    ligada às máquinas que ele pode reportar.
- **Liga/desliga:** `SIMULADOR_ATIVO` (padrão `true`).

## Success Criteria

1. O mesmo (máquina, instante) gera sempre a mesma leitura (teste).
2. Em 10 s, cada máquina ativa ganha exatamente uma leitura nova; máquinas inativas, nenhuma.
3. Depois de uma pausa de N minutos (simulando o Render dormindo), a subida preenche o intervalo
   sem duplicar leituras.
4. Ao longo de 24 h simuladas, cada cenário produz o comportamento da tabela (teste com
   faixas: ex.: Envasadora 04 com Disponibilidade < 70%).
5. `POST /api/leituras` sem chave ou com chave errada → 401; com chave certa → 201.
6. O índice TTL das leituras existe (o dos agregados entra no PR 2, com `indicadores`).

## Boundaries

- Always: gerador sem estado (puro) e testável; nada de `Math.random`/`Random` sem semente.
- Ask first: aumentar a frequência das leituras ou a retenção.
- Never: gravar `DEVICE_KEY` no código ou em log.

## Out of Scope (Deferred)

- Firmware do ESP32 → módulo `dispositivo` (Marco 6).
- WebSocket/SSE: as telas fazem polling a cada 10 s.
