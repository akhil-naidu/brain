## Context

Brain already sends `mode` in turn client context (`ask` | `agent`), gates all harness tools in Ask via `gateHarnessTool`, and injects Ask instructions. The mode picker is a plain Select with no accent. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Four modes with shared type + persistence
- Cursor-like accent tokens on picker + composer chrome
- Plan = research tools + plan instructions; Debug = full tools + debug instructions

**Non-Goals:**
- Editable virtual plan document artifact (markdown in chat is enough)
- Custom user-defined modes or per-mode model defaults

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

Implement via `shouldOmitHarnessTool(messages, kind: "all" | "mutating")` used by `gateHarnessTool`.

### Accents via CSS variables
Define `--brain-mode-ask|agent|plan|debug-*` in `globals.css` (green / neutral / amber / red). Mode picker and composer read `data-chat-mode` and apply classes. Prefer theme tokens over hard-coded Tailwind hex so light/dark both work.

### Shift+Tab cycles modes
Composer input handles Shift+Tab (when command menu closed) via `cycleBrainChatMode` → `onModeChange`. Order: Ask → Agent → Plan → Debug → Ask.

### Plan Build CTA
Show a Build button on the latest settled Plan-mode assistant message. On click: `setChatMode("agent")` and send an implement follow-up with `clientContext.mode: "agent"` (override), because mode state alone races with the closed-over turn context.

### Connection context string
Ask keeps the no-tools connections string. Plan/Debug/Agent use normal enabled-connection guidance; Plan/Debug instructions constrain behavior.

### Mode-aware MCP approval
`approvalForTool` denies all connection tools in Ask, and denies non-`safeReadOnlyTools` in Plan. Mode is synced into `defineState` (`brain.turnChatMode`) from a step.started instructions dynamic so connection approval (which has no messages) can read it.

## Risks / Trade-offs

- [Snowflake/Toolbox empty allowlists deny all tools in Plan] → Acceptable fail-closed until allowlists are filled.
- [Model ignores Plan instructions and claims it wrote files] → Mitigation: omit write/bash tools so it cannot; MCP mutators denied at approval.
- [Accent contrast in dark mode] → Mitigation: use oklch with checked foreground on tinted chips.

## Migration Plan

Existing `brain.chatMode` values `ask`/`agent` keep working. Unknown values fall back to `agent`. No server migration.

## Open Questions

None for v1.
