## Context

Brain already sends `mode` in turn client context (`ask` | `agent`), gates all harness tools in Ask via `gateHarnessTool`, and injects Ask instructions. The mode picker is a plain Select with no accent. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Four modes with shared type + persistence
- Cursor-like accent tokens on picker + composer chrome
- Plan = research tools + plan instructions; Debug = full tools + debug instructions

**Non-Goals:**
- Editable plan document artifact / Build CTA (user switches to Agent)
- Custom user-defined modes or per-mode model defaults
- Hard-blocking MCP connection tools in Plan (rely on instructions + harness gates for v1)

## Decisions

### Mode set mirrors Cursor’s four chat modes
`ask | agent | plan | debug` with Agent default. Alternatives: Ask/Agent only with colors (rejected — user asked for Plan/Debug too).

### Tool policy matrix
| Mode | Read tools (read/grep/glob/web/todo/skill) | Mutating (write_file, bash) |
|------|-------------------------------------------|-----------------------------|
| ask | omit | omit |
| plan | allow | omit |
| agent | allow | allow |
| debug | allow | allow |

Implement via `shouldOmitHarnessTool(messages, kind: "all" | "mutating")` used by `gateHarnessTool` / `gateMutatingHarnessTool`.

### Accents via CSS variables
Define `--brain-mode-ask|agent|plan|debug-*` in `globals.css` (green / neutral / amber / red). Mode picker and composer read `data-chat-mode` and apply classes. Prefer theme tokens over hard-coded Tailwind hex so light/dark both work.

### Plan does not ship a Build button
Plan ends with markdown plan + “switch to Agent”. A Build flow can be a follow-up.

### Connection context string
Ask keeps the no-tools connections string. Plan/Debug/Agent use normal enabled-connection guidance; Plan/Debug instructions constrain behavior.

## Risks / Trade-offs

- [MCP tools still callable in Plan] → Mitigation: Plan instructions forbid mutating connection actions; harden later if needed.
- [Model ignores Plan instructions and claims it wrote files] → Mitigation: omit write/bash tools so it cannot.
- [Accent contrast in dark mode] → Mitigation: use oklch with checked foreground on tinted chips.

## Migration Plan

Existing `brain.chatMode` values `ask`/`agent` keep working. Unknown values fall back to `agent`. No server migration.

## Open Questions

None for v1.
