# Slack inbound channel picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instance admins pick Slack mention channels from a checklist in Inbound settings, with paste as fallback, without changing allowlist dispatch.

**Architecture:** Pure helpers mark listed conversations as selected and split extra ids. `GET /api/slack-inbound/channels` lists conversations with the bot token. The inbound dialog adds a limit switch, filterable checklist, and extra-ids textarea. PUT still writes `allowedChannelIds` (`[]` when unrestricted).

**Tech Stack:** Existing Slack inbound allowlist, `listSlackConversationsForAllowlist`, `Switch`, Vitest. No Vercel Connect.

**Spec:** `docs/superpowers/specs/2026-08-17-slack-inbound-channel-picker-design.md`

## Global Constraints

- Dispatch and storage semantics unchanged (DMs always on; stored `[]` unrestricted and overrides env).
- Switch off writes `[]`. Switch on with no ids refuses save.
- No combobox, nested modal, Postgres, Reply from Brain, or other messengers.
- Do not commit unless the user asks.
- pnpm; `pnpm run verify`.

## File structure

| File | Responsibility |
| --- | --- |
| `lib/chat/slack-inbound/channel-picker.ts` | selected flags, extra ids, save payload |
| `app/api/slack-inbound/channels/route.ts` | GET list |
| `app/api/slack-inbound/route.ts` | PUT `limitMentions` empty → 400 |
| `app/_components/slack-inbound-settings.tsx` | Switch + checklist + extra paste |
| Docs + OpenSpec | Operator copy |

---

### Task 1: Pure picker helpers

**Files:**
- Create: `lib/chat/slack-inbound/channel-picker.ts`
- Test: `tests/lib/slack-inbound-channel-picker.test.ts`

```ts
export type SlackInboundListedChannel = {
  readonly id: string;
  readonly name: string;
  readonly selected: boolean;
};

export function markSlackInboundChannelsSelected(
  conversations: readonly { readonly id: string; readonly name: string }[],
  effectiveIds: readonly string[],
): SlackInboundListedChannel[];

export function extraSlackInboundChannelIds(
  effectiveIds: readonly string[],
  listedIds: readonly string[],
): string[];

export function slackInboundAllowlistSaveText(input: {
  readonly limitMentions: boolean;
  readonly selectedIds: readonly string[];
  readonly extraText: string;
}): { readonly ok: true; readonly allowedChannelsText: string } | { readonly ok: false; readonly error: string };
```

- `mark…`: case-insensitive id match; `selected` true if on effective list.
- `extra…`: effective ids not in listed ids (preserve order of effective).
- Save: `limitMentions` false → `{ ok: true, allowedChannelsText: "" }`. True → unique union of selected ids and parsed extra lines; empty union → `{ ok: false, error }` telling them to pick or paste a channel.

- [x] Failing tests, then implement, then pass.

---

### Task 2: GET `/api/slack-inbound/channels` + limiting PUT

**Files:**
- Create: `app/api/slack-inbound/channels/route.ts`
- Modify: `app/api/slack-inbound/route.ts`
- Test: extend `tests/lib/slack-inbound-channel-picker.test.ts` or add `tests/lib/slack-inbound-channels-load.test.ts` for a load helper:

```ts
export async function loadSlackInboundChannelPicker(input: {
  readonly botToken: string | null;
  readonly effectiveIds: readonly string[];
  readonly listConversations: (token: string) => Promise<readonly { id: string; name: string }[]>;
}): Promise<
  | { readonly ok: true; readonly channels: SlackInboundListedChannel[] }
  | { readonly ok: false; readonly error: string }
>;
```

No token → `{ ok: false }` without calling `listConversations`. Token → mark selected.

Route GET: `requireOperatorSession` (not merely signed-in). If credentials missing, 400. Else list + allowlistPayload ids.

PUT: add optional `limitMentions: z.boolean().optional()`. After resolve, if `limitMentions === true` and `allowedChannelIds.length === 0`, 400 `"Select at least one channel or paste a C… / G… id."` and do not write.

- [x] Tests for load helper; implement helper + routes.

---

### Task 3: Inbound settings UI

**Files:**
- Modify: `app/_components/slack-inbound-settings.tsx`

When dialog opens: `limitMentions = status.allowedChannelIds.length > 0`. Fetch `/api/slack-inbound/channels` if `hasBotToken`. Search filters by name/id. Checklist uses native checkbox + `#name` + muted id. Extra textarea = `extraSlackInboundChannelIds`. Save uses `slackInboundAllowlistSaveText`; on failure set formError. Send `limitMentions` and `allowedChannelsText`. Switch off disables checklist. No token: “Save a bot token to load channels.” Fetch error: inline alert, keep switch/paste.

`canSave` includes switch/selection/extra changes.

- [x] Implement UI; typecheck.

---

### Task 4: Docs + spec

- `content/docs/connections/slack.mdx` — switch, checklist, paste fallback.
- `openspec/specs/slack-inbound-channel/spec.md` — scenario that operators can select listed channels in Tools.
- `openspec/specs/customer-docs/spec.md` — picker mentioned.
- Mark picker design status implemented.

- [x] Docs; `pnpm run openspec:validate`; `pnpm run verify`.
