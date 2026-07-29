# Plan 03 — Ephemeral Chat Core

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Browser chat that streams messages through `useEveAgent()` with template-like message/composer rendering — **no** DB, server actions, or chat persistence.

**Architecture:** Port presentation components from the template (`message`, `markdown`, `conversation`, `composer`, UI primitives). Build a **thin** client bridge with `useEveAgent` from `eve/react`. Do **not** copy `app/actions/chat.ts`, Drizzle, or the persistence halves of `agent-chat.tsx`.

**Tech Stack:** `eve/react`, Streamdown + shiki stack as in template, Tailwind 4, shadcn-style UI primitives, lucide-react

## Global Constraints

- No chat persistence APIs or Neon.
- No Better Auth UI.
- Prefer copying files from `/Users/dev/github/tmp/eve-chat-template` then deleting auth/persist imports.
- Spec: `docs/superpowers/specs/2026-07-29-brain-chat-ui-design.md`

---

### Task 1: Install UI dependencies + Tailwind

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `postcss.config.mjs`
- Modify: `app/globals.css`
- Create: `components.json` (optional; may hand-copy UI files)
- Create: `lib/utils.ts` (`cn` helper)

**Interfaces:**
- Produces: Tailwind classes work in App Router

- [x] **Step 1: Install deps (UI only — no neon/auth/connect)**

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react \
  streamdown @streamdown/cjk @streamdown/code @streamdown/math @streamdown/mermaid \
  shiki @shikijs/core @shikijs/engine-javascript @shikijs/engine-oniguruma \
  radix-ui use-stick-to-bottom cmdk \
  tailwindcss @tailwindcss/postcss
```

Match versions loosely to `/Users/dev/github/tmp/eve-chat-template/package.json` when possible; keep Brain’s existing `eve` / `ai` / `zod` versions unless `withEve` requires a bump (document any bump in the commit message).

- [x] **Step 2: Add PostCSS + `cn`**

`postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

`lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [x] **Step 3: Seed `app/globals.css` from template, strip Vercel-only bits**

Copy `/Users/dev/github/tmp/eve-chat-template/app/globals.css` into `app/globals.css`. Keep CSS variables; teal branding comes in Plan 05 (neutral tokens OK for now).

- [x] **Step 4: Commit**

```bash
git add package.json package-lock.json postcss.config.mjs lib/utils.ts app/globals.css
git commit -m "$(cat <<'EOF'
Add Tailwind and chat UI dependencies for ephemeral Brain chat.

EOF
)"
```

---

### Task 2: Port UI primitives + chat presentation components

**Files:**
- Create (copy then strip): `components/ui/*` needed by chat (button, textarea, tooltip, collapsible, spinner, separator, dropdown-menu, badge, input-group, button-group, hover-card, dialog, select, command as required)
- Create: `components/chat/markdown.tsx`
- Create: `components/chat/message.tsx`
- Create: `components/chat/conversation.tsx`
- Create: `components/chat/composer.tsx`
- Create: `components/theme-provider.tsx` (optional for Plan 03; required by Plan 05)

**Interfaces:**
- Produces: presentational components with **no** imports from `app/actions`, `lib/db`, `lib/auth*`, `@vercel/*`
- Consumes: `cn`, Tailwind tokens

- [x] **Step 1: Copy UI + chat components from the mirror**

```bash
mkdir -p components/ui components/chat
cp /Users/dev/github/tmp/eve-chat-template/components/ui/*.tsx components/ui/
cp /Users/dev/github/tmp/eve-chat-template/components/chat/{markdown,message,conversation,composer}.tsx components/chat/
cp /Users/dev/github/tmp/eve-chat-template/components/theme-provider.tsx components/
cp /Users/dev/github/tmp/eve-chat-template/lib/chat/limits.ts lib/chat/limits.ts
```

- [x] **Step 2: Strip forbidden imports**

Search and fix:

```bash
rg -n "better-auth|@vercel/|lib/db|app/actions|drizzle|upstash|AuthDisplay|sign-in" components lib/chat || true
```

Expected: no matches after fixes. Composer placeholder → `Ask Brain anything...`. Fix `ChatComposer` props if template’s `onStop` is required but missing from the destructure (template has a type bug risk — ensure `onStop` is in the props list and wired to the stop button).

- [x] **Step 3: Commit**

```bash
git add components lib/chat
git commit -m "$(cat <<'EOF'
Port chat presentation components without auth or persistence.

EOF
)"
```

---

### Task 3: Ephemeral `useEveAgent` bridge + home page

**Files:**
- Create: `app/_components/ephemeral-agent-chat.tsx`
- Modify: `app/layout.tsx` (ThemeProvider + TooltipProvider)
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `EphemeralAgentChat` using `useEveAgent()`; exposes send/stop/reset via UI
- Consumes: `ChatComposer`, `AgentMessage` / conversation helpers, `eve/react`

- [x] **Step 1: Implement thin bridge** (do **not** port 2k-line `agent-chat.tsx`)

```tsx
"use client";

import { useEveAgent } from "eve/react";
import { useState } from "react";
import {
  ChatConversation,
  ChatConversationContent,
  ChatScrollButton,
} from "@/components/chat/conversation";
import { ChatComposer } from "@/components/chat/composer";
import { AgentMessage } from "@/components/chat/message";

export function EphemeralAgentChat() {
  const agent = useEveAgent();
  const [value, setValue] = useState("");
  const isBusy = agent.status === "submitted" || agent.status === "streaming";

  return (
    <div className="flex h-dvh flex-col">
      <ChatConversation className="flex-1">
        <ChatConversationContent>
          {agent.data.messages.map((message) => (
            <AgentMessage key={message.id} message={message} onSend={agent.send} />
          ))}
          {agent.error ? (
            <p className="text-sm text-destructive">{agent.error.message}</p>
          ) : null}
        </ChatConversationContent>
        <ChatScrollButton />
      </ChatConversation>
      <div className="border-t p-3">
        <ChatComposer
          isBusy={isBusy}
          onChange={setValue}
          onStop={() => agent.stop()}
          onSubmit={async (text) => {
            setValue("");
            await agent.send({ message: text });
          }}
          placeholder="Ask Brain anything..."
          value={value}
        />
      </div>
    </div>
  );
}
```

Adjust `AgentMessage` props to match the ported component’s actual API (read the file; wire HITL `onSend` / approve handlers as the template’s message component expects). If `AgentMessage` requires extra props from the template’s persistence layer, stub only what rendering needs (e.g. `isStreaming` from last message + status).

- [x] **Step 2: Mount on `/`**

Update `app/page.tsx` to render `<EphemeralAgentChat />`. Wrap layout with ThemeProvider + TooltipProvider like the template (without Analytics/SpeedInsights/AuthDisplay).

- [x] **Step 3: Manual verify**

```bash
npm run dev
```

Browser: open `http://127.0.0.1:3000`, send `Say hi in one sentence.`, confirm assistant text streams into the thread. Confirm no network calls to `/api/chats` or Neon.

- [x] **Step 4: Commit**

```bash
git add app components
git commit -m "$(cat <<'EOF'
Add ephemeral useEveAgent chat core in the browser UI.

EOF
)"
```

---

## Verifiable conclusion

Pass only if **all** are true:

1. Homepage shows composer + conversation chrome (not the Plan 02 placeholder-only page)
2. Sending a message streams an assistant reply in the UI without using `eve` terminal
3. `rg -n "appendChatEventAction|saveChatSnapshot|drizzle|@neondatabase" app components` finds nothing
4. Refreshing the page clears the conversation (ephemeral)
5. Errors from the agent surface in the UI when forced (e.g. empty `COMMAND_CODE_API_KEY` temporarily) — optional if key is always set; at minimum `agent.error` is rendered when present

**Stop here.** Do not start Plan 04 until this checklist passes.
