# Slack inbound Reply from Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** The owner can send from a Slack-mapped Brain sidebar chat and have the prompt plus assistant reply posted into that Slack thread, with HITL in the browser.

**Architecture:** Lookup the thread by Brain `chat_id`. HTTP Agent turns stay on eve HTTP. A owner-only `POST /api/chats/:id/slack-mirror` posts via the inbound bot token (`thread_ts`). Slack inbound is unchanged. The transcript hook appends Slack events but no longer writes Slack `continuationToken` onto `eveSession`.

**Tech Stack:** Existing Slack inbound store, `callSlackApi` / `chat.postMessage`, chat GET/PATCH, Vitest. No Vercel Connect.

**Spec:** `docs/superpowers/specs/2026-08-17-slack-inbound-reply-from-brain-design.md`

## Global Constraints

- Keep both eve channels (HTTP for Brain send, `slackChannel` for Slack messages).
- Never send Slack `continuationToken` to HTTP; if resume fails, new HTTP session on the same chat.
- Mirror uses inbound **bot** token, not Slack MCP user token.
- Allowlist is not consulted on the mirror path.
- Slack post failure does not roll back the Brain turn.
- Do not commit unless the user asks.
- pnpm; `pnpm run verify`. No Vercel Connect.

## File structure

| File | Responsibility |
| --- | --- |
| `lib/chat/slack-inbound/store.ts` | `getThreadChatByChatId` |
| `lib/chat/slack-inbound/thread-chat.ts` | Stop writing `eveSession` from Slack turns |
| `lib/chat/slack-inbound/slack-mirror.ts` | Format + post helper |
| `app/api/chats/[id]/route.ts` | GET `slackThread` |
| `app/api/chats/[id]/slack-mirror/route.ts` | POST mirror |
| `lib/chat/chats-api.ts` | Parse `slackThread`; `postSlackMirror` |
| `app/_components/chat-workspace.tsx` + `ephemeral-agent-chat.tsx` | Banner + mirror calls |
| Docs + OpenSpec | Operator copy |

---

### Task 1: Lookup mapping by chat id

**Files:**
- Modify: `lib/chat/slack-inbound/store.ts`
- Test: `tests/lib/slack-inbound-identity.test.ts` (same DB setup as thread upsert)

```ts
async function getThreadChatByChatId(chatId: string): Promise<SlackThreadChat | null>
```

- [x] Failing test: upsert thread → chat A; `getThreadChatByChatId(A)` returns the row. Upsert same Slack triple onto chat B; A is null, B is the row.
- [x] Implement `SELECT … WHERE chat_id = $1 LIMIT 1`. Export on the store object.
- [x] Pass.

---

### Task 2: Mirror format + post helper

**Files:**
- Create: `lib/chat/slack-inbound/slack-mirror.ts`
- Test: `tests/lib/slack-inbound-slack-mirror.test.ts`

```ts
export const SLACK_MIRROR_MAX_CHARS = 3500;

export function formatSlackMirrorText(
  role: "user" | "assistant",
  text: string,
): string | null;

export function assistantTextForSlackMirror(
  parts: readonly { readonly type: string; readonly text?: string }[],
): string;

export async function postSlackThreadMirror(input: {
  readonly botToken: string | null;
  readonly mapping: { readonly channelId: string; readonly threadTs: string } | null;
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly post: (body: {
    readonly channel: string;
    readonly thread_ts: string;
    readonly text: string;
  }) => Promise<{ readonly ok: boolean; readonly error?: string }>;
}): Promise<
  | { readonly ok: true; readonly posted: boolean }
  | { readonly ok: false; readonly status: 400 | 404 | 502; readonly error: string }
>;
```

- `formatSlackMirrorText`: trim; empty → `null`. Clip to `SLACK_MIRROR_MAX_CHARS` (ellipsis if clipped). User: `*From Brain*\n\n` + clipped. Assistant: clipped only.
- `assistantTextForSlackMirror`: concatenate `type === "text"` parts, skip reasoning/tools.
- `postSlackThreadMirror`: no mapping → 404 `"Chat is not linked to a Slack thread."`. No bot token → 400 `"Slack inbound is not configured."`. Empty format → `{ ok: true, posted: false }` without calling `post`. `post` `ok: false` → 502 with `error` or `"Could not post to Slack."`. Success → `{ ok: true, posted: true }` with `channel` + `thread_ts`.
- Tests must not import `channel-allowlist`.

- [x] Failing tests, implement, pass.

---

### Task 3: Transcript hook does not write Slack continuation

**Files:**
- Modify: `lib/chat/slack-inbound/thread-chat.ts`
- Modify: `agent/hooks/slack-inbound-transcript.ts` (stop passing sessionId/continuationToken if the append helper no longer needs them)

`appendSlackThreadEvent` should `updateChat` with `appendEvents: [event]` only — **do not set `eveSession`**.

- [x] Drop `sessionId` / `continuationToken` from the append helper (or ignore them). Hook still appends events.
- [x] `pnpm exec vitest run tests/lib/slack-inbound-dispatch.test.ts` still passes.

---

### Task 4: GET `slackThread` + POST `/api/chats/:id/slack-mirror`

**Files:**
- Modify: `app/api/chats/[id]/route.ts`
- Create: `app/api/chats/[id]/slack-mirror/route.ts`
- Modify: `lib/chat/chats-api.ts`
- Modify: `lib/chat/store/types.ts` only if we attach `slackThread` to a client type (prefer sibling JSON + client parse, do not persist on `brain_chat`)

GET after loading the chat:

```ts
const mapping = await getSlackInboundStore().getThreadChatByChatId(chat.id);
const slackThread =
  mapping && mapping.userId === session.session.userId
    ? { channelId: mapping.slackChannelId, threadTs: mapping.slackThreadTs }
    : null;
return NextResponse.json({ chat, slackThread });
```

Never put tokens on this payload.

POST: `requireWorkspaceSession`, `getChat` (404 if missing), parse `{ role: "user" | "assistant", text: string }`, `getThreadChatByChatId`, `resolveSlackInboundCredentials()?.botToken`, `postSlackThreadMirror` with `callSlackApi` `chat.postMessage` (`unfurl_links: false`). Map helper status to HTTP status. Do not import allowlist.

Client:

```ts
export type ChatSlackThread = { readonly channelId: string; readonly threadTs: string };

export async function getChat(id: string): Promise<ChatRecord & { slackThread: ChatSlackThread | null }>;

export async function postSlackMirror(
  chatId: string,
  body: { readonly role: "user" | "assistant"; readonly text: string },
): Promise<void>;
```

`getChat` parses optional `slackThread` (`null` if absent). `postSlackMirror` throws `Error` with server `error` string on non-OK.

- [x] Implement routes + client helpers. Typecheck.

---

### Task 5: Composer banner + mirror calls

**Files:**
- Modify: `app/_components/chat-workspace.tsx` — pass `slackThread` into the agent chat; for mapped chats pass `initialSession` **without** `continuationToken`.
- Modify: `app/_components/ephemeral-agent-chat.tsx`

Banner (mapped only), muted one line above the composer: `Replies also go to this Slack thread.`

After `send()` succeeds in `handleSubmit`, if `slackThread` and trimmed text: `void postSlackMirror(chatId, { role: "user", text }).catch(show error toast)` — do not fail the send.

In `handleFinish`, after persist, if mapped: take the last assistant message, `assistantTextForSlackMirror(parts)`, if non-empty post `{ role: "assistant", text }`. Same error handling. Skip empty/error turns.

If `send()` throws and the chat is mapped, `session.reset()` and retry `send` once (stale Slack continuation). Then mirror the user text if the retry works.

- [x] Implement UI. Typecheck. Do not import `resolve-channel-names` or `eve/channels/slack` from these client files.

---

### Task 6: Docs + OpenSpec

- `content/docs/connections/slack.mdx` — sidebar Slack chats can continue from Brain; prompt + reply post to the thread; Brain-started HITL is in the app; Slack-started HITL stays Slack buttons; allowlist still applies to Slack mentions only.
- `openspec/specs/chat-persistence/spec.md` — Slack chats are live from Brain, not transcript-only. Scenario: owner sends from the sidebar chat and Slack receives the prompt and reply.
- `openspec/specs/slack-inbound-channel/spec.md` — Reply from Brain scenario.
- `openspec/specs/customer-docs/spec.md` — Slack page mentions continuing from Brain.
- Mark spec status implemented after verify.

- [x] Docs; `pnpm run openspec:validate`; `pnpm run verify`.
