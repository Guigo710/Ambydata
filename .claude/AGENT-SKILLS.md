# Agent Skills

As pastas `skills/`, `agents/`, `references/` e `commands/` desta pasta são uma cópia de
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), fixada no commit
`39b723ceebf81474d0557c1fecd01eddab585563` (13/11/2026). Licença MIT: o texto completo está em
[AGENT-SKILLS-LICENSE](AGENT-SKILLS-LICENSE).

Elas ficam copiadas, e não instaladas como plugin, para funcionar em qualquer sessão do
Claude Code aberta neste repositório (local ou na nuvem) sem nenhum passo extra.

## O que mudou em relação ao original

| Mudança | Motivo |
|---|---|
| `commands/review.md` renomeado para `commands/revisar.md` | `/review` é um comando nativo do Claude Code |
| `agent-skills:<nome>` trocado por `<nome>` nos comandos | Sem plugin, as skills não têm prefixo |

Os textos das skills e dos agentes não foram alterados. Onde eles citam `/review`, neste
repositório o comando é `/revisar`.

## Comandos

| Comando | Skill principal |
|---|---|
| `/spec` | spec-driven-development |
| `/plan` | planning-and-task-breakdown |
| `/build` | incremental-implementation + test-driven-development |
| `/test` | test-driven-development |
| `/revisar` | code-review-and-quality |
| `/code-simplify` | code-simplification |
| `/constraints` | constraint-driven-development |
| `/webperf` | agente web-performance-auditor |
| `/ship` | shipping-and-launch |

Agentes disponíveis para revisão: `code-reviewer`, `security-auditor`, `test-engineer` e
`web-performance-auditor`.

## Como atualizar

```bash
git clone https://github.com/addyosmani/agent-skills /tmp/agent-skills
cd /tmp/agent-skills && git log -1 --format=%H   # anote o commit novo
```

Depois, a partir da raiz deste repositório:

```bash
rm -rf .claude/skills .claude/agents .claude/references .claude/commands
cp -r /tmp/agent-skills/skills /tmp/agent-skills/agents /tmp/agent-skills/references .claude/
cp -r /tmp/agent-skills/.claude/commands .claude/commands
cp /tmp/agent-skills/LICENSE .claude/AGENT-SKILLS-LICENSE
mv .claude/commands/review.md .claude/commands/revisar.md
sed -i 's/agent-skills:\([a-z-]*\)/\1/g' .claude/commands/*.md
```

Por fim, atualize o commit fixado neste arquivo. Faça a atualização num Pull Request próprio
e revise o diff antes do merge: são instruções que o agente vai seguir.
