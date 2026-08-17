# Slack inbound channel allowlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instance admins can optionally restrict Slack @mentions and thread follow-ups to a list of channel ids, while DMs and empty configuration stay unrestricted.

**Architecture:** A pure allowlist helper decides allow/deny. Host file `.eve/slack-inbound-credentials.json` stores `allowedChannelIds` beside bot secrets with independent lifetime. Dispatch checks the list before identity mapping. Tools inbound dialog edits the list; `#name` resolves on save via Slack `conversations.list`.

**Tech Stack:** Existing Slack inbound (`lib/chat/slack-inbound/*`, `agent/lib/slack-inbound-credentials.ts`, `app/api/slack-inbound/route.ts`, Tools Slack card). Vitest. No Postgres, no Vercel Connect.

**Spec:** `docs/superpowers/specs/2026-08-17-slack-inbound-channel-allowlist-design.md`

## Global Constraints

- No `@vercel/connect`, Vercel Connect, or `connectSlackCredentials`.
- Empty/unset allowlist = every channel the bot can see (today’s behavior).
- DMs are never filtered.
- Non-empty list cuts off other channels immediately (no goodbye message, including leftover threads and `/new`).
- Stored `allowedChannelIds` key (including `[]`) wins over `SLACK_INBOUND_CHANNEL_IDS`.
- **Remove saved** clears bot token and signing secret only.
- Do not commit unless the user asks.
- Package manager: pnpm. Quality gate: `pnpm run verify`.

## File structure

| File | Responsibility |
| --- | --- |
| `lib/chat/slack-inbound/channel-allowlist.ts` | Parse env, resolve stored vs env, `isSlackInboundChannelAllowed` |
| `agent/lib/slack-inbound-credentials.ts` | Persist `allowedChannelIds`; DELETE tokens only |
| `lib/chat/slack-inbound/resolve-channel-names.ts` | Parse textarea lines; resolve `#name` via injected Slack list |
| `lib/chat/slack-inbound/dispatch.ts` | Call allowlist before mapping |
| `app/api/slack-inbound/route.ts` | GET/PUT allowlist; allowlist-only PUT |
| `app/_components/slack-inbound-settings.tsx` | Allowed channels field + limited-to copy |
| Docs + OpenSpec delta | Operator-facing contract |

---

### Task 1: Pure allowlist helper

**Files:**
- Create: `lib/chat/slack-inbound/channel-allowlist.ts`
- Test: `tests/lib/slack-inbound-channel-allowlist.test.ts`

**Interfaces:**
- Produces:

```ts
export type SlackInboundChannelAllowlist = {
  readonly channelIds: readonly string[];
  readonly source: "stored" | "env" | null;
};

export function parseSlackInboundChannelIdList(raw: string | undefined): string[];

export function resolveSlackInboundChannelAllowlist(input: {
  readonly storedChannelIds: readonly string[] | undefined;
  readonly envChannelIds: string | undefined;
}): SlackInboundChannelAllowlist;

export function isSlackInboundChannelAllowed(input: {
  readonly isDirectMessage: boolean;
  readonly channelId: string;
  readonly allowedChannelIds: readonly string[];
}): boolean;
```

- `parseSlackInboundChannelIdList` splits on commas and whitespace, trims, drops empties.
- `resolve`: if `storedChannelIds` is an array (including empty), `source: "stored"` and those ids. Else parse env; non-empty env → `source: "env"`. Else `{ channelIds: [], source: null }`.
- `isSlackInboundChannelAllowed`: true if `isDirectMessage`, or `allowedChannelIds.length === 0`, or trimmed `channelId` is in the list.

- [ ] **Step 1: Write failing tests** in `tests/lib/slack-inbound-channel-allowlist.test.ts` covering: unrestricted (no stored, no env) allows mention; stored `[]` allows even when env has ids; stored `["C-ok"]` allows `C-ok`, denies `C-other`; DM allowed when list is `["C-ok"]`; env-only non-empty restricts when stored is `undefined`.

- [ ] **Step 2: Run** `pnpm exec vitest run tests/lib/slack-inbound-channel-allowlist.test.ts` — expect FAIL (module missing).

- [ ] **Step 3: Implement** `lib/chat/slack-inbound/channel-allowlist.ts`.

- [ ] **Step 4: Re-run tests** — expect PASS.

---

### Task 2: Persist allowlist without deleting it on Remove saved

**Files:**
- Modify: `agent/lib/slack-inbound-credentials.ts`
- Test: `tests/agent/slack-inbound-credentials.test.ts`

**Interfaces:**
- Extend stored schema with `allowedChannelIds: z.array(z.string()).optional()`.
- `writeSlackInboundCredentials` also accepts `allowedChannelIds?: readonly string[]`. Omitting the field on write keeps the existing stored list. Passing an array (including `[]`) writes the key. Token fields stay “empty means keep current.”
- `readSlackInboundStoredAllowlist(): Promise<readonly string[] | undefined>` — `undefined` means key absent.
- `deleteSlackInboundCredentials` removes `botToken` and `signingSecret` only. If `allowedChannelIds` remains, rewrite the file. If nothing remains, delete the file.
- `writeSlackInboundCredentials` may write allowlist-only (no token required) when `allowedChannelIds` is provided.

- [ ] **Step 1: Failing tests:** write allowlist-only; DELETE tokens leaves `allowedChannelIds`; stored empty array is readable as `[]` not `undefined`.

- [ ] **Step 2: Run** `pnpm exec vitest run tests/agent/slack-inbound-credentials.test.ts` — expect FAIL.

- [ ] **Step 3: Implement persistence.** Allowlist-only write: if no tokens would remain and no allowlist, still throw as today; if allowlist is provided, persist it even with no tokens.

- [ ] **Step 4: Re-run tests** — expect PASS.

---

### Task 3: Dispatch checks the allowlist before mapping

**Files:**
- Modify: `lib/chat/slack-inbound/dispatch.ts`
- Test: `tests/lib/slack-inbound-dispatch.test.ts`

**Interfaces:**
- Consumes: `resolveSlackInboundChannelAllowlist`, `isSlackInboundChannelAllowed`, `readSlackInboundStoredAllowlist`
- After bot/noise filters, compute `isDirectMessage`, resolve allowlist from stored + `process.env.SLACK_INBOUND_CHANNEL_IDS`, deny with `return null` (no `postPrivate` / `postPublic` / `reset`) before `mapInboundUser`.

- [ ] **Step 1: Failing tests:** mention in `C-other` with stored `["C-ok"]` returns null and does not `postPrivate`; subscribed follow-up in `C-other` same; DM still dispatches when list is `["C-ok"]`. Use the existing temp-cwd / file helpers or write the allowlist via `writeSlackInboundCredentials` after `chdir` if dispatch reads the host file — prefer injecting by writing the host file in a tmp cwd like credentials tests, **or** have dispatch call `readSlackInboundStoredAllowlist` which uses cwd. Dispatch tests today use a real DB and the repo cwd. Do **not** chdir the whole dispatch suite. Instead, have `handleSlackInboundMessage` accept an optional `allowlist` override for tests:

```ts
export type SlackInboundDispatchOptions = {
  readonly allowlist?: SlackInboundChannelAllowlist;
};
```

Default: resolve from store + env. Tests pass `{ channelIds: ["C-ok"], source: "stored" }`.

- [ ] **Step 2: Run dispatch tests** — expect the new cases FAIL.

- [ ] **Step 3: Wire the check.**

- [ ] **Step 4: Re-run** `pnpm exec vitest run tests/lib/slack-inbound-dispatch.test.ts` — expect PASS.

---

### Task 4: Parse textarea lines, resolve `#name`, API

**Files:**
- Create: `lib/chat/slack-inbound/resolve-channel-names.ts`
- Modify: `app/api/slack-inbound/route.ts`
- Test: `tests/lib/slack-inbound-resolve-channel-names.test.ts`

**Interfaces:**

```ts
export class SlackChannelResolveError extends Error {
  constructor(readonly message: string) { super(message); }
}

export function parseSlackInboundChannelLines(raw: string): string[];

export async function resolveSlackInboundChannelEntries(
  entries: readonly string[],
  listConversations: () => Promise<readonly { id: string; name: string }[]>,
): Promise<string[]>;
```

- Lines: split on newlines, trim, drop empties.
- Each entry: `C`/`G` + alphanumerics (`/^ [CG][A-Z0-9]+ $/i`) kept as uppercase id; `#name` looked up case-insensitive on `name`; anything else throws `SlackChannelResolveError`.
- Missing `#name` throws with text telling the operator to invite the bot or paste the channel id.

GET (operator): add `allowedChannelIds: string[]` (effective ids for the textarea) and `allowedChannelIdsSource: "stored" | "env" | null`.

PUT body:

```ts
{
  botToken?: string;
  signingSecret?: string;
  allowedChannelsText?: string; // textarea; omit to leave stored list unchanged
}
```

If `allowedChannelsText` is present, parse + resolve (need bot token stored or env for `#name`; id-only lists do not need a token). Write `allowedChannelIds`. Allow PUT with only `allowedChannelsText`.

Unresolved `#name` → 400 `{ error: string }`, no file write.

- [ ] **Step 1: Failing tests** for parse/resolve (ids, names, bad token, missing name).

- [ ] **Step 2: Implement resolver.**

- [ ] **Step 3: Wire GET/PUT.** For `#name`, call Slack `conversations.list` via `callSlackApi` with `types: "public_channel,private_channel"` and paginate `cursor` until exhausted or cap at a reasonable page count (e.g. 20). Map `channels[]` to `{ id, name }`.

- [ ] **Step 4: Run resolver tests** — expect PASS.

---

### Task 5: Tools inbound dialog

**Files:**
- Modify: `app/_components/slack-inbound-settings.tsx`

**Interfaces:**
- Consumes GET `allowedChannelIds` + `allowedChannelIdsSource`.
- Textarea “Allowed channels”; helper: leave blank for every channel; one `C…` / `G…` or `#name` per line. Prefill from `allowedChannelIds` joined by newlines.
- `canSave` true if tokens **or** the channels textarea changed (including clearing it).
- Save sends `allowedChannelsText` always when the dialog saves (current box contents) so empty save writes stored `[]`.
- Card subtitle when effective list is non-empty: `Limited to N channels` (N = `allowedChannelIds.length`).
- Status pill unchanged (credentials only).

- [ ] **Step 1: Add textarea + limited-to line; allow save without new tokens.**

- [ ] **Step 2: Typecheck/lint the component.**

---

### Task 6: Docs and OpenSpec delta

**Files:**
- Modify: `content/docs/connections/slack.mdx`
- Modify: `content/docs/reference/environment.mdx`
- Modify: `.env.example`
- Create: `openspec/changes/add-slack-inbound-channel-allowlist/` (proposal, design pointer, delta spec, tasks)
- Modify: `openspec/specs/slack-inbound-channel/spec.md` (or leave the add to archive-time — **write the delta now** and also add the requirement to main spec in the same change so shipped behavior matches `openspec/specs`. For this repo, add the requirement to `openspec/specs/slack-inbound-channel/spec.md` **and** keep an active change only if we still want apply/archive. Prefer: delta change + update main spec in Task 6 so docs/specs stay aligned without a leftover active change. Create the change artifacts then immediately sync the ADDED requirement into the main spec, matching how we archived inbound.)

**Requirement to add** (main spec `openspec/specs/slack-inbound-channel/spec.md`):

### Requirement: Optional channel allowlist for mentions
When an allowlist of Slack channel ids is configured (instance-stored or `SLACK_INBOUND_CHANNEL_IDS`), the system MUST start Agent turns for @mentions and active-thread follow-ups only in those channels. Direct messages MUST still dispatch. When no allowlist is stored and the env var is unset, mentions MUST work in every channel the bot can see. A stored empty list MUST mean unrestricted and MUST override env. Denied channels MUST NOT start a turn and MUST NOT post a refusal.

Scenarios: unrestricted default; stored empty overrides env; mention outside list is ignored; DM still works; leftover thread outside list is ignored.

Customer-docs: Slack page documents the textarea, empty = all, DMs always, silent ignore, env var.

- [ ] **Step 1: Update customer docs and `.env.example`.**
- [ ] **Step 2: Add the main spec requirement (and a short archived or active OpenSpec change). If creating an active change, archive it after sync in the same task so `openspec/changes/` does not keep a leftover.**
- [ ] **Step 3: `pnpm run openspec:validate` and `pnpm run verify`.**

## Spec coverage

| Spec section | Task |
| --- | --- |
| Empty = unrestricted | 1, 3 |
| DMs never filtered | 1, 3 |
| Non-empty allowlist + cut off, no goodbye | 1, 3 |
| Stored `[]` overrides env | 1, 2 |
| Host file + Remove saved keeps list | 2 |
| Tools dialog + `#name` + allowlist-only PUT | 4, 5 |
| GET source for textarea | 4, 5 |
| Docs + env | 6 |
| Tests listed in spec | 1–4 |

## Verifiable conclusion

- [ ] Mention in a non-allowed channel does not dispatch.
- [ ] DM still dispatches with a non-empty allowlist.
- [ ] Empty stored list allows mentions despite env ids.
- [ ] Remove saved tokens leaves allowlist on disk.
- [ ] `#bad-name` resolve fails closed (error, no write) at the helper.
- [ ] `pnpm run verify` passes.
- [ ] No Vercel Connect.
