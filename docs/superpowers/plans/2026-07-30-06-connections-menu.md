# Plan 06 — Connections Menu (ClickUp / Slack / Asana / Gmail)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Composer integrations menu toggles Brain’s MCP connections and passes enabled/disabled context into each turn; connection authorization prompts render in the UI.

**Architecture:** Port `integrations-menu.tsx` but replace Notion/Linear/Sentry with ClickUp/Slack/Asana/Gmail. Reuse Plan 04 `EnabledConnections`. On send, attach `clientContext` strings (template pattern in `agent-chat.tsx` `createConnectionClientContext`). Keep existing `agent/connections/*.ts` OAuth implementations — do not use `@vercel/connect`.

**Tech Stack:** Existing MCP OAuth connections, `useEveAgent` `send({ clientContext })`, dropdown menu UI

## Global Constraints

- No Vercel Connect.
- Connections already live in `agent/connections/{clickup,slack,asana,gmail}.ts`.
- Reference: `/Users/dev/github/tmp/eve-chat-template/components/chat/integrations-menu.tsx` and `createConnectionClientContext` in `app/_components/agent-chat.tsx`
- Spec: connections menu wired to real OAuth

---

### Task 1: Integrations menu for Brain connections

**Files:**
- Create: `components/chat/integrations-menu.tsx`
- Modify: `components/icons.tsx` (simple marks or lucide fallbacks — no need for Notion/Linear icons)
- Modify: composer footer in ephemeral chat / shell to include the menu

**Interfaces:**
- Consumes: `useChatShell().enabledConnections` / `setConnectionEnabled`
- Produces: menu items for `clickup | slack | asana | gmail`

- [x] **Step 1: Implement menu**

```tsx
const CONNECTION_ITEMS = [
  { key: "clickup", label: "ClickUp" },
  { key: "slack", label: "Slack" },
  { key: "asana", label: "Asana" },
  { key: "gmail", label: "Gmail" },
] as const;
```

Copy structure from the template menu (checkbox rows + toggle pills). Remove setupStatus gate that depends on Neon/auth setup — treat as always ready (`setupReady = true`) for Brain v1.

- [x] **Step 2: Place menu in composer `footerStart`**

- [x] **Step 3: Commit**

```bash
git add components/chat/integrations-menu.tsx components/icons.tsx app
git commit -m "$(cat <<'EOF'
Add composer connections menu for MCP providers.

EOF
)"
```

---

### Task 2: clientContext on send + authorization UI

**Files:**
- Modify: `app/_components/ephemeral-agent-chat.tsx` (or shell where `send` lives)
- Ensure `AgentMessage` renders connection authorization / HITL parts (already in template message component)

**Interfaces:**
- Produces: each `send` includes clientContext describing enabled connections
- Consumes: `EnabledConnections`

- [x] **Step 1: Port context helper**

```ts
export function createConnectionClientContext(enabledConnections: EnabledConnections): string {
  const enabled = Object.entries(enabledConnections)
    .filter(([, on]) => on)
    .map(([name]) => name);
  const disabled = Object.entries(enabledConnections)
    .filter(([, on]) => !on)
    .map(([name]) => name);

  if (enabled.length === 0) {
    return "The user has disabled all external connections for this turn. Do not search or call connection tools unless the user enables a connection first.";
  }

  const disabledContext =
    disabled.length > 0
      ? ` Do not use disabled connections unless the user enables them first: ${disabled.join(", ")}.`
      : "";

  return `The user has enabled these external connections for this turn: ${enabled.join(", ")}. Use an enabled connection when it is relevant to the user's request.${disabledContext}`;
}
```

- [x] **Step 2: Send with context**

```ts
await agent.send({
  message: text,
  clientContext: createConnectionClientContext(enabledConnections),
});
```

- [x] **Step 3: Verify authorization rendering**

Confirm message parts that request connection authorization show a usable control (open URL / continue) using the ported `AgentMessage` behavior. If the template required skip-auth server actions, replace with `agent.send` HITL response only (no DB skip action).

- [x] **Step 4: Manual verify**

1. Menu lists ClickUp, Slack, Asana, Gmail.
2. Toggle one off; send a message — clientContext reflects disabled set (inspect network payload or temporary console log).
3. With credentials configured, triggering a connection tool surfaces an authorize affordance in the UI (not only `.eve/*-authorize-url.txt`).

- [x] **Step 5: Commit**

```bash
git add app components lib
git commit -m "$(cat <<'EOF'
Wire connection toggles into turn clientContext and auth UI.

EOF
)"
```

---

## Verifiable conclusion

Pass only if **all** are true:

1. Composer connections menu shows exactly ClickUp, Slack, Asana, Gmail (not Notion/Linear/Sentry)
2. Toggles update UI state immediately
3. Sends include connection clientContext derived from toggles
4. No `@vercel/connect` dependency or Connect UID env vars required
5. Existing `agent/connections/*.ts` files remain the source of OAuth truth

**Stop here.** Do not start Plan 07 until this checklist passes.
