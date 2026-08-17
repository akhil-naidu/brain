# Slack inbound: Reply from Brain

**Status:** Implemented.  
**Date:** 2026-08-17  
**Depends on:** Slack inbound channel (`openspec/specs/slack-inbound-channel/spec.md`), sidebar transcripts (`openspec/specs/chat-persistence/spec.md`)

Let the mapped owner continue a Slack thread from its Brain sidebar chat: the Agent turn runs in the browser, and the prompt plus reply are posted into that Slack thread.

## Goal

Opening a Slack-mapped personal chat in Brain is a live conversation, not a read-only transcript. Sending from the composer continues the same Slack thread. Slack follow-ups still update that chat.

## Decisions

| Topic | Choice |
| --- | --- |
| Agent channel | Keep both: Brain send uses eve HTTP (HITL in the browser). Slack messages still use `slackChannel` (HITL Slack buttons). |
| Same “session” | Same Brain chat + same Slack thread. Not one eve session id (HTTP and Slack continuation tokens do not transfer). |
| Slack continuation on HTTP | Never. If stored `eveSession` cannot resume on HTTP, start a new HTTP session on this chat (history stays). |
| Mirror | Bot `chat.postMessage` of the Brain **user prompt** (labeled From Brain) then the **assistant text**, `thread_ts` = mapped thread. |
| Allowlist | Still gates Slack-originated mentions only. Owner can mirror into an already-mapped thread after the channel is dropped from the list. |
| Slack post failure | Brain turn still runs. Show an error in Brain; do not roll back the chat. |
| Transcript hook | Keep appending Slack-turn events to the chat. Do **not** write Slack `continuationToken` onto `eveSession` (that token is not valid for HTTP). |

## Non-goals

- Unifying Slack and HTTP onto one eve session / rewriting inbound dispatch
- Token-by-token Slack streaming
- Mirroring tool calls, reasoning, or HITL UI into Slack
- Open-in-Slack deep link (nice later)
- Shared Slack chats, other messengers, Vercel Connect, Socket Mode

## Behavior

Slack inbound dispatch, identity mapping, `/new` remapping, bot-author ignore, and mention allowlist stay as today.

When the owner opens a chat that has a `brain_slack_thread_chat` row for that `chat_id`:

1. Composer stays on (it already is). A short banner: replies also go to this Slack thread.
2. Submit runs a normal HTTP Agent turn as that user in that workspace. HITL is the in-app approval UI.
3. After the user prompt is accepted, the server posts it to Slack as the Brain bot in the mapped channel/thread, prefixed so it is obviously from Brain (not a Slack human).
4. When the assistant turn has final visible text, the server posts that text to the same thread (clip long text the same way morning-brief delivery does, ~3500 chars). Empty/error turns post nothing.
5. Slack ignores those bot messages (existing rule), so they do not start another turn.
6. A later human Slack reply still goes through `slackChannel`. Thread context includes the mirrored Brain messages. The transcript hook appends that Slack turn into this chat.

`/new` in Slack still creates a new Brain chat and remaps the thread. The previous sidebar chat loses the mapping and becomes ordinary Brain-only history.

A **new chat** started in Brain is not mapped and does not post to Slack.

**Stale HTTP/Slack session:** send anyway on this chat. New HTTP session; same Slack thread.

**Overlap:** v1 does not serialize Brain vs Slack turns on the same chat. Last events win in the transcript. Acceptable; turn locks stay a shared-chat feature.

## API

Lookup by `chat_id` (owner + active workspace), in addition to today’s team/channel/thread lookup.

`GET /api/chats/:id` (existing auth): include `slackThread: { channelId, threadTs } | null`. Never include bot token, signing secret, or Slack user tokens. `null` when this chat is not the current mapping for a thread (including chats unmapped by `/new`).

`POST /api/chats/:id/slack-mirror` (chat owner only):

```ts
{ role: "user" | "assistant"; text: string }
```

- Resolve mapping for this chat. Missing → `404`.
- Resolve inbound **bot** token (stored then env). Missing → `400` (inbound is off).
- Do not consult the mention allowlist.
- `chat.postMessage` with `channel` + `thread_ts` from the mapping. User role body is `*From Brain*\n\n` plus the prompt (same clip as briefs). Assistant role is the text only (clipped).
- Slack API failure → `502` with a safe error string. Do not put the bot token in the response.

The browser calls this after the user prompt is persisted and after the assistant text is complete. Bot token never goes to the client.

## UI

On a mapped chat, above the composer: muted one-line banner that replies also go to Slack. No extra confirm dialog.

Composer, HITL, cancel, `/new` in the Brain composer (new Brain chat, not Slack `/new`) stay as today.

If mirror `POST` fails, toast/inline error; the Brain transcript still has the turn.

## Tests

- `getThreadChatByChatId` returns the row for the owner chat; after `/new` remap, the old chat id is not mapped.
- Mirror helper posts `thread_ts` and does not post when mapping or bot token is missing.
- User payload includes a From Brain label; assistant payload does not duplicate that label.
- Allowlist helper is not called on the mirror path (Brain send still posts).
- Slack dispatch still ignores bot authors (no echo loop).
- Existing inbound allowlist / HITL / identity tests stay green.

## Docs

Slack connection page: sidebar Slack chats can continue from Brain; prompts and replies are posted to the thread; HITL for those turns is in Brain; Slack-started turns still use Slack buttons; allowlist still applies to Slack mentions, not to this mirror.

Update `openspec/specs/chat-persistence/spec.md` (Slack chats are no longer transcript-only) and `openspec/specs/slack-inbound-channel/spec.md` (Reply from Brain scenario). Customer-docs Slack page stays in sync.

## Risks

- **[Two eve sessions]** HTTP and Slack do not share sandbox/tool state. Mitigation: same chat history on both sides via events + Slack thread context; accept split runtime for v1.
- **[Transcript hook clobbering HTTP session]** Today it writes Slack continuation onto `eveSession`. Mitigation: append events only; HTTP session is written only by the Brain composer.
- **[Mirror fail after prompt posted]** Slack has the question and no answer. Mitigation: error in Brain; user can retry send or reply in Slack.
- **[Bot token vs MCP token]** Mirror must use inbound bot token so the post is the Brain bot (ignored by dispatch), not the user’s Slack MCP grant.
