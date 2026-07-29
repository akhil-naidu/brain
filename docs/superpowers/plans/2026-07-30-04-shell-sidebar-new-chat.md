# Plan 04 — Shell Sidebar + New Chat

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Template-like sidebar chrome with New chat that resets the ephemeral eve session — no persisted history.

**Architecture:** Adapt `components/chat/sidebar.tsx` and a slim shell context. History list shows at most the current in-tab session title (derived locally from first user message). No `/api/chats`, no Drizzle.

**Tech Stack:** React client components, existing Plan 03 chat core

## Global Constraints

- No chat DB or server actions for history.
- No auth/user menu in the sidebar.
- Reference: `/Users/dev/github/tmp/eve-chat-template/components/chat/sidebar.tsx`, `app/_components/agent-chat-shell.tsx`
- Spec sidebar rules: ephemeral only

---

### Task 1: Shell context + sidebar port

**Files:**
- Create: `app/_components/chat-shell-context.tsx` (slim)
- Create: `components/chat/sidebar.tsx` (copy then strip)
- Create: `lib/chat/title.ts` (copy local title helper from template)
- Modify: `app/_components/ephemeral-agent-chat.tsx`
- Create: `app/_components/brain-chat-shell.tsx`

**Interfaces:**
- Produces: `BrainChatShell` with sidebar + main slot; `onNewChat` calls agent `reset()` and clears local title
- Consumes: Plan 03 `EphemeralAgentChat` (refactor to accept `agent` or expose `reset` via ref/callback)

- [ ] **Step 1: Copy sidebar + title helper; strip persistence**

```bash
cp /Users/dev/github/tmp/eve-chat-template/components/chat/sidebar.tsx components/chat/sidebar.tsx
cp /Users/dev/github/tmp/eve-chat-template/lib/chat/title.ts lib/chat/title.ts
```

Remove: pagination fetch, delete chat API, auth buttons, user menu, links to `/chat/[id]` that load DB rows. Keep visual structure (header, new-chat control, list area).

Sidebar props should look like:

```tsx
export function ChatSidebar({
  brand,
  currentTitle,
  onNewChat,
}: {
  readonly brand: ReactNode;
  readonly currentTitle: string | null;
  readonly onNewChat: () => void;
}) { /* ... */ }
```

- [ ] **Step 2: Slim shell context (optional but useful for Plan 06)**

```tsx
"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type EnabledConnections = {
  readonly clickup: boolean;
  readonly slack: boolean;
  readonly asana: boolean;
  readonly gmail: boolean;
};

type ChatShellValue = {
  readonly enabledConnections: EnabledConnections;
  readonly setConnectionEnabled: (key: keyof EnabledConnections, enabled: boolean) => void;
};

const ChatShellContext = createContext<ChatShellValue | null>(null);

export function ChatShellProvider({ children }: { readonly children: ReactNode }) {
  const [enabledConnections, setEnabledConnections] = useState<EnabledConnections>({
    clickup: true,
    slack: true,
    asana: true,
    gmail: true,
  });

  const value = useMemo<ChatShellValue>(
    () => ({
      enabledConnections,
      setConnectionEnabled: (key, enabled) => {
        setEnabledConnections((prev) => ({ ...prev, [key]: enabled }));
      },
    }),
    [enabledConnections],
  );

  return <ChatShellContext.Provider value={value}>{children}</ChatShellContext.Provider>;
}

export function useChatShell() {
  const value = useContext(ChatShellContext);
  if (!value) throw new Error("useChatShell requires ChatShellProvider");
  return value;
}
```

(Plan 06 wires the menu; Plan 04 only needs the provider mounted.)

- [ ] **Step 3: Wire shell + New chat → `reset()`**

Refactor `EphemeralAgentChat` so the shell can call `reset` and read messages for title:

- Lift `useEveAgent()` into `BrainChatShell`, **or** use an imperative handle / callback registration.
- On New chat: `agent.reset(); setTitle(null); setDraft("")`.
- After first user message, set title via `lib/chat/title.ts`.

- [ ] **Step 4: Manual verify**

1. Open UI — sidebar visible with Brain brand slot (text OK until Plan 05).
2. Send a message — title appears for current session.
3. Click New chat — messages clear; composer empty.
4. Confirm no `/api/chats` requests in Network tab.

- [ ] **Step 5: Commit**

```bash
git add app components lib/chat
git commit -m "$(cat <<'EOF'
Add ephemeral sidebar shell with New chat reset.

EOF
)"
```

---

## Verifiable conclusion

Pass only if **all** are true:

1. Sidebar is visible on `/` with a New chat control
2. New chat clears the in-memory conversation (messages gone)
3. No chat history API routes exist under `app/api/chats`
4. Refresh still clears history (still ephemeral)
5. Chat send/stream from Plan 03 still works inside the shell

**Stop here.** Do not start Plan 05 until this checklist passes.
