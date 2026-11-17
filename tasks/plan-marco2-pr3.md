# Implementation Plan: Marco 2 — PR 3 (chamados, alertas e notificações)

Source spec: SPEC-chamados.md (depende de fabrica, simulacao e indicadores)

## Overview

Tela **Report de Manutenção** em kanban (Abertos, Em andamento, Finalizados dos últimos 7 dias):
o operário (ou o engenheiro) abre o chamado, o engenheiro assume e finaliza com a solução, e
quem abriu recebe a notificação no sino. Uma máquina que passa do limite crítico abre o
chamado sozinha. O OEE ganha o MTTR para ENGENHEIRO e DIRETOR.

## Architecture Decisions

- **Pacotes novos:** `chamado/` (modelo, API, transições), `alerta/` (detector dos limites
  críticos) e `notificacao/` (coleção, API).
- **Chamado** guarda uma cópia de nome, setor e linha da máquina (o card não depende de a
  máquina mudar depois), quem abriu (usuário ou "Sistema"), responsável, datas de cada etapa,
  solução ou motivo do cancelamento e um **histórico** de eventos.
- **Transições atômicas:** cada ação é um `findAndModify` condicionado ao status atual
  (ex.: assumir só se ABERTO). Dois engenheiros clicando "Assumir" juntos: um ganha, o outro
  recebe 409. Transição inválida também é 409.
- **Chamado automático sem duplicar:** índice único parcial em (máquina, causa) só para
  chamados automáticos ainda abertos ou em andamento. Uma segunda detecção vira um evento no
  histórico do chamado existente, mesmo com dois detectores rodando juntos.
- **Detector de alertas** a cada 30 s, para cada máquina ativa:
  - temperatura: última leitura além do limite crítico;
  - parada: parada contínua, dentro do turno, por mais que `minutosParadoMax`;
  - defeitos: taxa de defeitos da última hora acima de `taxaDefeitosMax` (com no mínimo 100
    peças, para não alarmar com amostra pequena).
- **Carência de 1 h** depois de finalizar ou cancelar um chamado automático da mesma máquina e
  causa. Sem ela, a Seladora 05 (cenário de defeitos altos, sempre acima de 8%) reabriria o
  chamado no segundo seguinte à finalização.
- **Notificações:** coleção `notificacao` com TTL de 30 dias. Geradas ao finalizar (para quem
  abriu, se foi uma pessoa) e ao abrir chamado automático (para todos os engenheiros ativos).
- **MTTR** = média de (finalização − abertura) dos chamados finalizados da máquina nos últimos
  7 dias, em `GET /api/chamados/mttr` (ENGENHEIRO e DIRETOR).
- **Frontend:** rota `/manutencao` ("Report de Manutenção", logo abaixo de Status da Máquina),
  com o seletor de máquina como filtro ("Todas as máquinas"); kanban busca a cada 10 s; sino na
  barra superior a cada 15 s. Fluxo por botões, sem arrastar (spec).

## Task List

### Phase 1: Backend
- [x] Task 1: Chamado — modelo, abrir, listar (filtros e 7 dias de finalizados), detalhe com histórico, assumir/finalizar/cancelar atômicos com 409 e permissões (M)
- [x] Task 2: Notificações — coleção com TTL, API das suas notificações, aviso ao finalizar (S)
- [x] Task 3: Detector de alertas críticos (temperatura, parada, defeitos), sem duplicar, com carência e aviso aos engenheiros (M)
- [x] Task 4: MTTR por máquina (S)

### Checkpoint: Backend
- [x] Testes verdes; com o simulador rodando local, o Forno 02 abre um chamado automático CRÍTICO e não duplica

### Phase 2: Frontend
- [x] Task 5: Serviço de chamados, rota e menu "Report de Manutenção", kanban com os cards (M)
- [x] Task 6: Abrir chamado; assumir, finalizar e cancelar (engenheiro); detalhe com histórico (M)
- [ ] Task 7: Sino de notificações na barra superior (S)
- [ ] Task 8: MTTR na tela de OEE para ENGENHEIRO e DIRETOR (S)

### Phase 3: Fechamento
- [ ] Task 9: Navegador ponta a ponta (operário abre → engenheiro assume e finaliza → operário vê o aviso), READMEs, revisões (code-reviewer, security-auditor) e PR (S)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Chamados automáticos demais (cenários simulados ficam críticos o tempo todo) | Med | deduplicação + carência de 1 h; mínimo de 100 peças para defeitos |
| Detector pesado a cada 30 s | Low | só a última leitura e a última hora de 6 máquinas, com índice máquina+instante |
| Corrida entre engenheiros, ou detector e finalização ao mesmo tempo | Med | transições com condição de status e índice único parcial |
| Render dormindo: detector não roda | Low | ao acordar, o preenchimento da última hora e o próximo ciclo do detector avaliam a situação atual |

## Open Questions

- Nenhuma da spec; a carência de 1 h e o mínimo de 100 peças estão acima para aprovação.
