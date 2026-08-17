# Slack inbound channel allowlist

**Status:** Implemented.  
**Date:** 2026-08-17  
**Depends on:** Slack inbound channel (archived OpenSpec `add-slack-inbound-channel`)

Optional restriction so instance admins can limit **@mentions and thread follow-ups** to chosen Slack channels. DMs stay on. Empty configuration keeps today’s “any channel the bot can see” behavior.

## Goal

Operators who invite the Brain bot to a Slack workspace can stop it answering in `#general` (and other channels) without turning inbound off. Existing hosts that never set a list keep working.

## Decisions

| Topic | Choice |
| --- | --- |
| Empty / unset list | Unrestricted (mentions work in every channel the bot can see) |
| DMs | Never filtered |
| Non-empty list | Allowlist of Slack channel ids (`C…` / `G…`) |
| Leftover threads | Cut off immediately; no turn and no goodbye message |
| Storage | Host file next to inbound credentials, not Postgres |
| Edit surface | Tools → Slack → Inbound settings (instance admin) |
| Channel picker | Out of scope (paste ids or `#name`) |
| Env | `SLACK_INBOUND_CHANNEL_IDS` as deploy-time fallback |

## Non-goals

- Slack conversations multi-select picker
- Postgres / instance-policy storage (wait until inbound secrets move off `.eve/`)
- Filtering DMs
- Socket Mode, browser resume of Slack sessions, other messengers
- Vercel Connect or `@vercel/connect`

## Behavior

Resolve the effective allowlist:

1. If the host file has an `allowedChannelIds` key (including `[]`), use that list. Stored empty means unrestricted and **overrides** env.
2. Else if `SLACK_INBOUND_CHANNEL_IDS` is set, split on commas/whitespace into ids. Non-empty env list restricts.
3. Else unrestricted.

Then for each inbound event, after ignoring bots and unmentioned channel noise, **before** identity mapping or `/new`:

- Direct message (`kind === "dm"` or Slack IM) → allow.
- Unrestricted list → allow.
- Channel id (trimmed) is in the allowlist → allow.
- Otherwise return `null`: no Agent turn, no private/public Slack reply, including `/new` and already-active threads.

Compare stored ids to the event’s `channelId`. Persist canonical Slack ids only, not `#names`.

## Storage

Keep secrets and the allowlist in `.eve/slack-inbound-credentials.json` so one inbound dialog can save both, with independent lifetimes:

- Fields: `botToken?`, `signingSecret?`, `allowedChannelIds?: string[]`, `updatedAt`.
- **Remove saved** deletes `botToken` and `signingSecret` only. If only `allowedChannelIds` remains, keep the file. Do not fall back to deleting the whole file when an allowlist is present.
- File mode stays `0600`; do not log channel ids as a substitute for secrets (ids are not secret, but skip the signing secret as today).

Env fallback for channels is independent of token source (`stored` / `env` / `mixed`).

## UI and API

`GET` / `PUT` `/api/slack-inbound` (instance admin):

- GET includes `allowedChannelIds: string[]` (empty array when unrestricted from storage’s point of view; the client may also need `allowedChannelIdsSource: "stored" | "env" | null` so the textarea can show env-applied ids without pretending they are saved).
- PUT accepts `allowedChannelIds` and/or the existing token fields. Saving **only** the channel list is valid (relax today’s “token or secret required”).
- PUT parses the textarea: one id or `#name` per line; ignore blank lines; trim. `#name` is resolved with the bot token (stored or env) via Slack `conversations.list` (public and private). Unresolved names or tokens that are neither `C`/`G` ids nor `#name` → `400`, no write.
- DELETE remains “clear stored tokens” and does not clear `allowedChannelIds`. Clearing the allowlist is: empty the textarea and Save (writes `allowedChannelIds: []`).

Inbound settings dialog: “Allowed channels” textarea under the secrets. Helper text: leave blank for every channel; one `C…` / `G…` or `#name` per line. Status pill stays about credentials. If the effective list is non-empty, a short line on the Slack card says inbound is limited to those channels.

## Dispatch

Add a pure helper (e.g. `isSlackInboundChannelAllowed`) used by `handleSlackInboundMessage`. Unit-test the helper; add a dispatch case that a mention in a non-allowed channel does not map or start a turn.

## Docs

- Slack connection page: optional allowlist, empty = all channels, DMs always on, cut-off of other threads.
- `.env.example` and environment reference: `SLACK_INBOUND_CHANNEL_IDS`.

## Tests

- Unrestricted (missing stored + missing env) allows a mention.
- Stored `[]` allows a mention even when env has ids.
- Stored `["C-ok"]` allows `C-ok`, denies another channel for mention and subscribed follow-up, allows a DM.
- Env-only non-empty list restricts when stored key is absent.
- PUT `#bad-name` with no matching conversation returns 400 and does not change the file.
- DELETE tokens leaves `allowedChannelIds` in place.

## Risks

- **[Bot not in channel]** `#name` resolve uses conversations the bot can list; a private channel it has not joined will fail save. Mitigation: tell the operator to invite the bot or paste the `C`/`G` id.
- **[Env vs UI surprise]** A host with env ids and a saved empty list is unrestricted. Document that Save with an empty box writes stored `[]` and ignores env.
- **[Silent ignore]** People @mentioning in a blocked channel get no reply. That is intentional (no goodbye). Docs mention it so it does not look like a dead bot.
