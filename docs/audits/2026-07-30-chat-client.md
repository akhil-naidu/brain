# Chat client audit

Date: 2026-07-30

Scope:

- `app/_components/ephemeral-agent-chat.tsx`
- `app/_components/brain-chat-shell.tsx`
- `app/_components/chat-shell-context.tsx`
- `app/page.tsx`
- `app/layout.tsx`
- `components/theme-provider.tsx`
- `app/globals.css`

Framework ground truth was checked against eve 0.27.6's bundled documentation and shipped declarations. `npx tsc --noEmit` passes. No P0 defects were found.

### P1 Stop fallback detaches before cancellation settles

**Status:** Fixed (Stop keeps the stream open until a terminal boundary; only New-chat/navigation dispose may detach after an 8s timeout).

**Location:** `app/_components/ephemeral-agent-chat.tsx` (was timer at ~227-235)

**Problem:** The Stop button requests cooperative cancellation, but after 1.5 seconds it aborts the local stream and marks cancellation idle even if eve has not emitted the cancellation boundary. This is especially likely in the exact case named by the comment: recursive subagent cancellation can take longer than 1.5 seconds. The composer can then accept another message while the previous turn is still cancelling, and the `ClientSession` has not consumed the required `turn.cancelled` → `session.waiting` boundary. A subsequent send can fail against the still-active turn or consume the old boundary as the new response's first boundary, leaving the new turn's output unobserved.

**Evidence:**

```tsx
cancelFallbackTimerRef.current = window.setTimeout(() => {
  const status = agentStatusRef.current;
  if (status === "submitted" || status === "streaming") {
    // Cooperative cancel can lag with subagents; unlock the composer.
    agentStopRef.current();
    setCancellationState("idle");
    cancellationRef.current = { requested: false };
  }
}, CANCEL_UI_FALLBACK_MS);
```

eve explicitly requires the opposite behavior:

- `node_modules/eve/docs/guides/frontend/overview.mdx:101-103`: a Stop UI should call `session.cancel({ turnId })`, keep the stream open until the cancellation boundary, and “do not use `stop()` for this interaction.”
- `node_modules/eve/docs/guides/client/streaming.mdx:20`: “Cancellation does not replace stream consumption.”
- `node_modules/eve/dist/src/client/session-utils.d.ts:9-14`: without a boundary, the client cursor remains merely resumable rather than settled for the next turn.

**Proposed fix:** Remove the timer path that calls `agent.stop()` and unlocks the composer. Keep `isBusy` true until `handleEvent` observes `session.waiting`, `session.failed`, or another documented terminal boundary. If a UX timeout is required, keep Stop visibly pending and offer a separate explicit “detach” action that starts a fresh `ClientSession`; do not silently treat detachment as successful server cancellation.

### P1 Starting a new chat leaves the old durable turn running

**Status:** Fixed (`onDisposeReady` + `runWithDisposal` cancel/reset before remount; auth-only busy detaches immediately with best-effort cancel).

**Location:** `app/_components/brain-chat-shell.tsx`; `app/_components/ephemeral-agent-chat.tsx`

**Problem:** “New chat” changes the keyed component immediately. The old `EphemeralAgentChat` unmounts, but its only cleanup clears a UI timer; it does not cooperatively cancel the active eve turn or abort its stream. The old `useEveAgent` async operation can therefore keep consuming events and running callback closures after its UI is gone, while the server continues model/tool/subagent work and billing. In an ephemeral-only UI there is no way to return to that discarded run.

**Evidence:**

```tsx
const handleNewChat = useCallback(() => {
  setSessionKey((current) => current + 1);
  setTitle(null);
  setDraft("");
}, []);
```

```tsx
useEffect(() => () => clearCancelFallbackTimer(), [clearCancelFallbackTimer]);
```

The shipped `useEveAgent` contract only says `stop()` aborts the in-flight stream (`node_modules/eve/dist/src/react/use-eve-agent.d.ts:31-32`); eve's frontend guide states that stopping/detaching does not stop the server-side turn (`node_modules/eve/docs/guides/frontend/overview.mdx:99-103`). Cooperative server cancellation is `ClientSession.cancel({ turnId })` (`node_modules/eve/dist/src/client/session.d.ts:39-53`).

**Proposed fix:** Expose an async “dispose current chat” command from `EphemeralAgentChat` to the shell. Before incrementing `sessionKey`, request `session.cancel({ turnId })` when a turn is active, then stop/detach the local stream and remount. Also add an unmount safety cleanup that aborts local consumption; guard asynchronous cancellation error handlers from calling React setters after unmount.

### P2 Repeated identical turn failures are not shown

**Status:** Fixed (failure toasts keyed by event identity via `failureEventId` / `seenFailureIdsRef`).

**Location:** `app/_components/ephemeral-agent-chat.tsx`

**Problem:** Failure notification is keyed only by the failure message string. `prepareTurn()` clears `clientError`, but `latestTurnFailureMessage` still evaluates to the prior string. If a later turn fails with the same message, the effect dependency is unchanged, so the effect does not run and the second failure gets no toast. This is common for repeatable failures such as the same tool or provider error.

**Evidence:**

```tsx
const latestTurnFailureMessage = useMemo(() => {
  for (let index = agent.events.length - 1; index >= 0; index -= 1) {
    const event = agent.events[index]!;
    if (isTurnFailureEvent(event)) {
      return event.data.message;
    }
  }
  return null;
}, [agent.events]);

useEffect(() => {
  if (!latestTurnFailureMessage) {
    return;
  }
  setClientError((previous) =>
    previous === latestTurnFailureMessage ? previous : latestTurnFailureMessage,
  );
  setDismissedError((previous) => (previous === null ? previous : null));
}, [latestTurnFailureMessage]);
```

**Proposed fix:** Track the latest failure event, not only its message. Depend on a stable event identity such as `{ turnId, sequence, stepIndex, type }`, or handle the event directly in `handleEvent` and set the toast for every newly observed failure. Keep dismissal identity separate from display text so two equal messages from different turns are distinct notifications.

### P2 Streaming recreates callbacks and rerenders all historical messages

**Status:** Fixed (`send` destructured; ref-stable row actions; `AgentMessage` memo with settled-row comparator; child-failure map scoped to the active message).

**Location:** `app/_components/ephemeral-agent-chat.tsx`; `components/chat/message.tsx`

**Problem:** Every streamed event creates a new `useEveAgent` snapshot. Both send callbacks depend on the entire `agent` helper object, so they are recreated on every token. The component then maps every historical message through a non-memoized row, passing the newly created `handleInputResponses` to each row. Long conversations therefore rerender and reprocess all prior markdown/tool content for every token rather than updating only the active message.

**Evidence:**

```tsx
const handleInputResponses = useCallback(
  async (responses: readonly AgentInputResponse[]) => {
    // ...
    await agent.send({ /* ... */ });
  },
  [agent, enabledConnections, prepareTurn],
);
```

```tsx
{messages.map((message) => (
  <AgentMessage
    canRespond={canRespondToMessage(message.id)}
    childFailuresByCallId={childFailuresByCallId}
    key={message.id}
    message={message}
    onInputResponses={handleInputResponses}
  />
))}
```

eve documents that assistant parts stream into the hook state as events arrive (`node_modules/eve/docs/guides/frontend/overview.mdx:99`), and `send` itself is a stable command callback in the shipped React hook implementation.

**Proposed fix:** Destructure stable commands (`const { send } = agent`) and depend on `send` instead of the whole snapshot object. Memoize message rows with props that preserve referential equality for settled messages, and isolate live status/child-failure data so only the active or affected row rerenders. Profile a long markdown/tool transcript after the change to confirm settled rows no longer render per token.

### P2 Undefined Geist variables invalidate the global font declarations

**Status:** Fixed (`font-family` uses `var(--font-sans)` / `var(--font-mono)`).

**Location:** `app/globals.css`

**Problem:** `--font-geist-sans` and `--font-geist-mono` are never defined anywhere in the repository. A missing custom property without a fallback makes the entire declaration invalid at computed-value time; the comma after `var(--font-geist-*)` does not rescue the declaration. Consequently the body and code-element declarations fall back to browser defaults instead of the intended `--font-sans` and `--font-mono` stacks.

**Evidence:**

```css
body {
  /* ... */
  font-family: var(--font-geist-sans), var(--font-sans);
}

code,
kbd,
pre,
samp {
  font-family: var(--font-geist-mono), var(--font-mono);
}
```

A repository-wide search finds these two references and no definitions. The actual stacks are defined as `--font-sans` and `--font-mono` at `app/globals.css:29-30`.

**Proposed fix:** Use `font-family: var(--font-sans)` and `font-family: var(--font-mono)`. Alternatively, load `Geist` and `Geist_Mono` with `next/font` and define the exact variables referenced here, using a nested `var()` fallback such as `var(--font-geist-sans, var(--font-sans))`.

### P3 Dark mode flashes the light theme during startup

**Status:** Fixed (CSS `@media (prefers-color-scheme: dark)` token fallback + blocking `THEME_BOOTSTRAP_SCRIPT` before paint; `ThemeProvider` only keeps the preference in sync).

**Location:** `app/layout.tsx`; `app/globals.css`; `lib/theme/bootstrap.ts`; `components/theme-provider.tsx`

**Problem:** Server-rendered HTML is explicitly light, and the system dark preference is applied only in `useEffect`, which runs after the first paint. Dark-mode users therefore see a light flash on every initial navigation/reload. `suppressHydrationWarning` hides mismatch diagnostics but does not prevent the incorrect first paint.

**Evidence:**

```tsx
<html className="light" lang="en" style={{ colorScheme: "light" }} suppressHydrationWarning>
```

```tsx
useEffect(() => {
  const media =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
  // ...
  syncTheme();
}, []);
```

**Proposed fix:** For system-only theming, express the initial colors with `@media (prefers-color-scheme: dark)` so CSS selects the correct theme before paint, and use JavaScript only if runtime overrides are needed. If class-based theming must remain, run a minimal nonce-compatible pre-hydration script in the root layout that sets the class and `color-scheme` before content paints.

## Overall assessment

The App Router boundaries, hydration suppression, context memoization, message keys, timer cleanup, and eve client/session construction are otherwise sound, and strict TypeScript reports no errors. The highest-risk area is cancellation: the implementation correctly uses a guarded `turnId`, but then defeats eve's cancellation contract by detaching on a timer and by remounting without disposing an active turn. Error handling is generally user-visible, with one event-identity bug for repeated failures. CSS tokens resolve correctly apart from the undefined font variables, and theme switching cleans up its media listener correctly.
