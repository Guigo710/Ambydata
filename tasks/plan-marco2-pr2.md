# Implementation Plan: Marco 2 — PR 2 (indicadores)

Source spec: SPEC-indicadores.md (depende de SPEC-fabrica.md e SPEC-simulacao.md)

## Overview

Trocar os números e gráficos fixos do template por indicadores calculados das leituras:
Painel, Status da Máquina, OEE, Produtividade e Custos, todas com o seletor de máquina e um
bloco "Sobre estes dados" (fonte, frequência, última leitura e fórmula), atualizando a cada 10 s.

## Architecture Decisions

- **Cálculo puro e testável:** `CalculadoraIndicadores` recebe totais (segundos planejados,
  operando e parados, número de paradas, peças produzidas e boas) e devolve D, P, Q, OEE, MTBF,
  downtime, custo, receita e lucro. Os testes conferem com contas feitas à mão.
- **Agregados por hora** na coleção `indicador_hora` (`<maquinaId>:<hora>`, TTL de 90 dias),
  gravados por um job a cada hora fechada. As leituras brutas (48 h) servem só para a hora
  corrente e para o gráfico de temperatura.
- **Horas em que o Render dormiu:** para máquina simulada, o agregado é recalculado pelo
  próprio gerador (é determinístico, então dá o mesmo que teria sido gravado); a subida preenche
  assim os últimos 7 dias que faltarem (~1 mil agregados, em memória, ~1 s). Para máquina com
  dispositivo, hora sem leitura fica como lacuna, não como máquina parada.
- **Tempo planejado = tempo dentro do turno:** leituras FORA_DO_TURNO não entram em nenhum
  indicador. "Paradas" = quantas vezes a máquina passou de operando para parada.
- **API em `/api/indicadores`** como na spec; `financeiro` só para DIRETOR. Respostas já trazem
  os números usados em cada fórmula, para a tela mostrar "D = 52 min ÷ 60 min".
- **Frontend:** hooks em `services/indicadores.js` com `refetchInterval` de 10 s (pausa com a aba
  escondida, padrão do TanStack Query); componente `SobreEstesDados`; gráficos com o Recharts que
  já está no projeto.
- **Menu (ordem):** Painel, Status da Máquina, OEE, Produtividade, Custos (DIRETOR), Máquinas,
  Meu perfil. "Report de Manutenção" entra no PR 3, logo abaixo de Status da Máquina.

## Task List

### Phase 1: Backend
- [x] Task 1: `CalculadoraIndicadores` com testes de conta à mão (S)
- [x] Task 2: Agregados por hora — coleção com TTL, job da hora fechada e preenchimento de 7 dias (M)
- [ ] Task 3: API `resumo`, `maquinas/{id}/agora` e `leituras/{id}` (M)
- [ ] Task 4: API `historico`, `comparativo` e `financeiro` (DIRETOR) com permissões (M)

### Checkpoint: Backend
- [ ] Testes verdes; respostas conferidas no Mongo local com 7 dias preenchidos

### Phase 2: Frontend
- [ ] Task 5: Serviço de indicadores, `SobreEstesDados`, rotas e menu novos (S)
- [ ] Task 6: Painel principal — cards por máquina agrupados por linha, ou o resumo de uma (M)
- [ ] Task 7: Status da Máquina — status, temperatura × faixa (amarelo/vermelho), gráfico de 2 h com faixa e limite crítico, peças e paradas (M)
- [ ] Task 8: OEE — hora e turno, D × P × Q com fórmula e números, 24 h; MTBF e downtime para ENGENHEIRO e DIRETOR (M)
- [ ] Task 9: Produtividade (peças/h, boas × defeituosas, por setor/linha, 24 h e 7 dias) e Custos e Lucros (DIRETOR) (M)

### Phase 3: Fechamento
- [ ] Task 10: Navegador ponta a ponta, READMEs, revisões (code-reviewer, security-auditor) e PR (S)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Consultas lentas no Atlas free ao abrir o Painel com 6 máquinas a cada 10 s | Med | uma agregação só para o resumo; índices `maquinaId+instante` e `maquinaId+hora` |
| Preenchimento de 7 dias atrasa a subida no Render | Low | roda depois de a API subir, com falha só em log (como o de leituras) |
| Testes dependentes de horário | Med | instante passado como parâmetro; nada de `Instant.now()` dentro do cálculo |
| Gráficos difíceis de testar | Low | testar os números e textos; o gráfico conferido no navegador |

## Open Questions

- Nenhuma: decisões da spec aprovada; a de recalcular horas dormidas pelo gerador está acima
  para aprovação.
