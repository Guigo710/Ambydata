# Spec: chamados — V1 (com alertas automáticos e notificações mínimas)

Status: proposto
Módulos: `chamados`, `alertas`, `notificacoes` (Marco 3, PR 3 de 3) — ver CAPABILITY-MAP.md
Depende de: `fabrica`, `simulacao`, `indicadores`

## Objective

Tela **Report de Manutenção** em formato kanban: o operário abre um chamado para uma máquina,
o engenheiro assume e finaliza, e quem abriu é avisado. Uma máquina que passa do limite
crítico abre o chamado sozinha.

## Fluxo

```
Operário abre ──► ABERTO ──(Engenheiro clica "Assumir")──► EM ANDAMENTO ──(Engenheiro
"Finalizar" + solução)──► FINALIZADO ──► notificação para quem abriu
                 └──(Engenheiro "Cancelar" + motivo)──► CANCELADO (fora do kanban)
```

- O card muda de coluna sozinho: as colunas são o status, e a tela se atualiza a cada 10 s.
- "Assumir" grava o engenheiro como responsável.
- **Chamado automático:** quando uma leitura passa do limite crítico da máquina (temperatura
  acima de `temperaturaMax`, parada sem justificativa por mais de `minutosParadoMax` em turno,
  taxa de defeitos da última hora acima de `taxaDefeitosMax`), abre um chamado com
  "Aberto por: Sistema (máquina)", prioridade CRÍTICA e a nota com o valor medido e o limite.
  Se já houver chamado aberto ou em andamento para a mesma máquina e causa, só acrescenta um
  evento ao histórico.

## Card

Título (tipo + máquina), **quem abriu** (nome ou "Sistema — limite ultrapassado"), **notas**
explicando o problema, **data e hora**, **setor**, **máquina**, prioridade (cor), responsável
quando houver. Clicar abre o detalhe com o histórico e, ao finalizar, a solução.

## Telas e permissões

| Ação | OPERARIO | ENGENHEIRO | DIRETOR | ADMIN |
|---|---|---|---|---|
| Ver o kanban (todas as máquinas, filtro pelo seletor) | ✅ | ✅ | ✅ | — |
| Abrir chamado | ✏️ | ✏️ | — | — |
| Assumir, finalizar, cancelar | — | ✏️ | — | — |
| Sino de notificações | ✅ | ✅ | ✅ | — |

Coluna "Finalizados" mostra os últimos 7 dias.

## Notificações (mínimo necessário)

- Coleção `notificacao` (`usuarioId`, `texto`, `link`, `lida`, `criadaEm`; TTL de 30 dias).
- Geradas quando: um chamado é finalizado (para quem abriu); um chamado automático é aberto
  (para todos os engenheiros ativos).
- Sino na barra superior com o número de não lidas; clicar lista as notificações e leva ao
  chamado. Atualiza a cada 15 s.

## Contrato da API

| Método e rota | Quem |
|---|---|
| `GET /api/chamados?status=&maquinaId=` | produção |
| `POST /api/chamados` `{ tipo, maquinaId, descricao, prioridade }` | OPERARIO, ENGENHEIRO |
| `GET /api/chamados/{id}` (com histórico) | produção |
| `POST /api/chamados/{id}/assumir` | ENGENHEIRO |
| `POST /api/chamados/{id}/finalizar` `{ solucao }` | ENGENHEIRO |
| `POST /api/chamados/{id}/cancelar` `{ motivo }` | ENGENHEIRO |
| `GET /api/notificacoes` · `POST /api/notificacoes/{id}/lida` · `POST /api/notificacoes/lidas` | produção (as suas) |

Transições inválidas (finalizar um ABERTO, assumir um FINALIZADO) → 409.

## Success Criteria

1. O operário abre um chamado pela tela e ele aparece em "Abertos" com nome, notas, data/hora,
   setor e máquina.
2. O engenheiro assume → card em "Em andamento" com o responsável; finaliza com solução →
   "Finalizados" e o operário recebe a notificação no sino.
3. Transições inválidas e perfis sem permissão são recusados no backend (testes).
4. O ciclo simulado do Forno 02 abre um chamado automático CRÍTICO e não duplica enquanto ele
   estiver aberto.
5. MTTR (abertura → finalização) aparece no OEE para ENGENHEIRO e DIRETOR.

## Out of Scope (Deferred)

- Arrastar e soltar cards (o fluxo é por botões, como pedido).
- E-mail, WhatsApp e push no celular.
- Chamados de suporte de TI (RF13) e anexos/fotos.
- Alertas não críticos como sugestão de chamado: nesta versão aparecem só como aviso no
  Status da Máquina.
