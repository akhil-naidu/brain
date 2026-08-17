# Slack inbound channel picker

**Status:** Implemented.  
**Date:** 2026-08-17  
**Depends on:** Slack inbound channel allowlist (`docs/superpowers/specs/2026-08-17-slack-inbound-channel-allowlist-design.md`)

Let instance admins pick Slack channels from a checklist instead of only pasting ids, without changing allowlist dispatch rules.

## Goal

Operators can see the channels the Brain bot can list and tick the ones that may @mention Brain. Pasting ids remains for channels Slack did not return. Empty/off stays unrestricted.

## Decisions

| Topic | Choice |
| --- | --- |
| UI | Checklist in the existing Inbound settings dialog |
| Unrestricted | Explicit switch **Limit @mentions to selected channels** (off = every channel) |
| Unlisted channels | Extra paste box for `C…` / `G…` ids |
| Switch on + nothing selected | Refuse save (`400`), do not write |
| Dispatch / storage | Unchanged from the allowlist spec |
| Channel picker API | `GET /api/slack-inbound/channels` (instance admin, bot token) |

## Non-goals

- Search combobox / chip picker
- Nested “Choose channels” modal
- Changing empty-list or DM semantics
- Postgres storage, Socket Mode, Reply from Brain, other messengers
- Vercel Connect

## Behavior

Allowlist resolution, DMs, cut-off, stored `[]` vs env, and **Remove saved** stay as in the allowlist spec.

The switch only controls what Save writes:

- **Off** → `allowedChannelIds: []` (unrestricted; stored empty overrides env).
- **On** → union of checked listed channel ids and extra pasted ids (existing line parser; `#name` still resolves via `conversations.list`). Must have at least one id after resolve or Save fails.
- Switch defaults **On** when the effective allowlist is non-empty, **Off** when unrestricted.

Listed channels are not duplicated in the paste box. Paste is only for ids the list did not include (already-saved ids whose conversation is missing still appear as extra paste lines so they are not dropped).

## API

`GET /api/slack-inbound/channels` (instance admin):

- Resolve bot token the same way inbound credentials do (stored then env).
- If missing, `400` with a message to save inbound credentials. Do not list.
- `conversations.list` public + private, exclude archived (same helper as `#name` resolve). Return `{ channels: { id, name, selected }[] }` where `selected` is whether that id is on the **effective** allowlist. Never include the bot token or signing secret.

Existing `GET`/`PUT` `/api/slack-inbound`:

- PUT still accepts `allowedChannelsText` (or equivalent id array). The client sends the union: when the switch is off, empty text / `[]`; when on, checked ids plus extra paste lines.
- Server keeps current validation (bad tokens `400`, `#name` resolve failure `400`, empty-on is a client+server check: empty resolved list on a “limiting” save is `400`).

A dedicated PUT flag `limitMentions: boolean` is optional. Prefer: client always sends the id list to write (`[]` when unrestricted) so the server stays dumb.

## UI

Same dialog, under bot token and signing secret:

1. Switch: Limit @mentions to selected channels.
2. When on: search field + scrollable checklist (`#name`, muted id). Load the list when the dialog opens if a bot token exists; otherwise copy: save a bot token to load channels.
3. Extra channel ids textarea (ids not in the fetched list).
4. List fetch error: inline error; switch and paste still work; do not clear the saved allowlist.

Status pill remains credentials-only. Slack card still says “Limited to N channels” when the effective list is non-empty.

Use the existing `Switch` component (`components/ui/switch.tsx`).

## Tests

- Channels GET maps listed conversations and `selected` from the effective allowlist.
- Channels GET without a bot token is `400` and does not call Slack.
- PUT `[]` (switch off) writes stored empty list.
- PUT with no ids when the client intends to limit is `400` and does not change the file (cover via resolver/API: empty limiting payload).
- PUT unions extra pasted ids with listed ids.
- Existing dispatch allowlist tests remain passing.

## Docs

Slack connection page: switch, checklist, paste as fallback, off/empty = every channel, DMs always on, mentions outside the list ignored.

## Risks

- **[Huge workspaces]** 20 pages × 200 channels may still be large. Mitigation: client-side filter; combobox is a later change.
- **[Private channel not listed]** Bot not invited. Mitigation: paste id; helper text says invite the bot or paste the id.
- **[Switch off vs env]** Saving with the switch off writes `[]` and ignores `SLACK_INBOUND_CHANNEL_IDS`. Same as today’s empty textarea save; document it.
