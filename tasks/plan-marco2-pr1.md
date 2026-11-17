# Implementation Plan: Marco 2 — PR 1 (fabrica + simulacao)

Source spec: SPEC-fabrica.md, SPEC-simulacao.md

## Overview

Cadastro de máquinas com parâmetros e limites de alerta (ENGENHEIRO), seed da fábrica fictícia,
gerador determinístico de leituras com cenários, job de 10 s com preenchimento de lacunas,
endpoint de ingestão para dispositivos e, no frontend, a tela Máquinas e o seletor de máquina
ao lado do título das telas de produção.

## Architecture Decisions

- **Pacotes novos:** `maquina/` (entidade, API, regras) e `simulacao/` (gerador, job, ingestão,
  coleção `leitura`).
- **Gerador puro:** `GeradorLeituras.leitura(maquina, instante)` sem estado, com
  `SplittableRandom` semeado por (id da máquina, bloco de 10 s). Cenário guardado na máquina
  (`cenarioSimulacao`, só alterável pelo seed/migração).
- **Leituras com `_id` determinístico** (`<maquinaId>:<epoch/10>`): gravar duas vezes o mesmo
  instante não duplica (upsert), o que torna o preenchimento de lacunas idempotente.
- **Agregados horários ficam para o PR 2** (`indicadores`), que é quem os consome; aqui só as
  leituras brutas com TTL de 48 h.
- **Seletor de máquina** guarda a escolha na URL (`useSearchParams`), e o menu preserva o
  parâmetro ao trocar de tela.

## Task List

### Phase 1: Backend
- [x] Task 1: Máquina — entidade, migração 002 com as 6 máquinas, API com permissões e validação (M)
- [ ] Task 2: Gerador determinístico de leituras e cenários (M)
- [ ] Task 3: Job de 10 s, preenchimento de lacunas e TTL de 48 h (S)
- [ ] Task 4: `POST /api/leituras` com `X-Device-Key` (S)

### Checkpoint: Backend
- [ ] `./mvnw verify` verde; leituras aparecendo no Mongo local a cada 10 s

### Phase 2: Frontend
- [ ] Task 5: Serviço de máquinas, `SeletorMaquina` e rotas/menu das telas de produção (M)
- [ ] Task 6: Tela Máquinas (lista e formulário com parâmetros e alertas) (M)

### Phase 3: Fechamento
- [ ] Task 7: Navegador ponta a ponta, READMEs, revisões (code-reviewer, security-auditor) e PR (S)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Job de 10 s no Render free consome cota do Atlas | Low | ~52 mil leituras/dia × ~150 B ≈ 8 MB/dia, com TTL de 48 h |
| Render dorme e o job para | Med | preenchimento de lacunas na subida (última hora) |
| Testes do job dependentes de tempo | Med | `Clock` injetado e job chamado direto nos testes |
