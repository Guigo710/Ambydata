# Capability Map: AmbyData — V1

Fonte: documento "AmbyData — Decisões do Projeto" (rev 12).
Status: aprovado.

| Module id | Responsabilidade | Depende de | Marco |
|---|---|---|---|
| monorepo | Repositório `Ambydata` com `backend/` + `frontend/`, histórico preservado, CI, README único, deploys Vercel/Render | — | 0 |
| identity | JWT, 4 perfis (OPERARIO, ENGENHEIRO, DIRETOR, ADMIN), login, Meu perfil, gestão de usuários pelo Admin, rotas protegidas, Swagger | monorepo | 1 |
| fabrica | Setores, linhas e máquinas (parâmetros de referência), seed 2 linhas / 6 máquinas | identity | 2 |
| simulacao | Endpoint `POST /api/leituras` (X-Device-Key), gerador determinístico com cenários, preenchimento de lacunas, TTL das leituras brutas | fabrica | 2 |
| indicadores | Agregados por hora; OEE, MTBF, downtime, produtividade, lucro; telas Painel, Status, OEE, Custos, Produtividade | simulacao | 2 |
| chamados | Chamado com tipo/prioridade/status/histórico, fluxo do engenheiro, MTTR | fabrica, identity | 3 |
| alertas | Regras de alerta (sugestão) e de falha crítica (chamado automático, sem duplicatas) | indicadores, chamados | 3 |
| notificacoes | Sino com não lidas por perfil, banner de crítico, polling | alertas, chamados | 3 |
| chao-de-fabrica | Paradas, turnos, edição de parâmetros/máquinas | fabrica, identity | 4 |
| relatorios | Produção e perdas, comparativos, layout dos setores | indicadores, chao-de-fabrica | 5 |
| dispositivo | ESP32 enviando para o endpoint de `simulacao` | simulacao | 6 |

Ordem de build:
monorepo → identity → fabrica → simulacao → indicadores → chamados → alertas → notificacoes → chao-de-fabrica → relatorios → dispositivo

Grafo (sem ciclos):

```
monorepo ─► identity ─► fabrica ─► simulacao ─► indicadores ─┐
                │          │                                 ├─► alertas ─► notificacoes
                │          └────────► chamados ──────────────┘
                └──────────────────► chao-de-fabrica ─► relatorios ◄── indicadores
simulacao ─► dispositivo
```

Cada módulo recebe o próprio `SPEC-<module-id>.md` na raiz do monorepo, escrito e aprovado na ordem acima, antes de virar plano (`tasks/plan.md`) e código.
