# Chat components code audit

Scope: `components/chat/*.tsx`, `components/ui/*.tsx`, `components/icons.tsx`, and `components/brain-mark.tsx`. Files under `app/**` and `lib/chat/**` were read only to establish call-site behavior. The repository passes `npm run typecheck`.

## Findings

### [P0] Authorization links accept executable URL schemes

**Location:** `components/chat/message.tsx:207-232`

**Problem:** The authorization URL is placed directly into an anchor without validating its scheme. A `javascript:` URL would execute in the application origin when the user clicks “Connect.” `rel="noreferrer"` does not mitigate an executable `href`.

**Evidence:**

```tsx
const url = part.authorization?.url;
// ...
{url ? (
  <div className="mt-2.5">
    <Button asChild size="xs" type="button">
      <a href={url} rel="noreferrer" target="_blank">
        Connect
```

**Proposed fix:** Parse the value before rendering and allow only expected protocols (normally `https:`, plus an explicitly gated `http:` exception for localhost development). Render no link, or an error state, when parsing fails or the protocol is not allowed. Use `rel="noopener noreferrer"` explicitly.

### [P1] Growing tool groups remount and discard interaction state

**Location:** `components/chat/message.tsx:110-125`

**Problem:** A tool group's React key is derived from every call currently in the group. When contiguous streamed tool calls arrive incrementally, the key changes from (for example) `tools:A` to `tools:A:B`. React replaces the existing `ToolGroup`, resetting disclosure state and any typed `InputRequestActions` freeform response.

**Evidence:**

```tsx
const partsForGroup = pendingTools;

elements.push(
  <ToolGroup
    // ...
    key={`tools:${partsForGroup.map((part) => part.toolCallId).join(":")}`}
    parts={partsForGroup}
  />,
);
```

**Proposed fix:** Give each logical group an identity that does not change as calls are appended, such as the first call ID plus the surrounding stable step identity. Keep the growing call-ID list in props, not in the key. Add a streaming test that types into the first call's input before a second contiguous call arrives.

### [P1] Earlier unfinished tool groups can stay “Running” forever

**Location:** `components/chat/message.tsx:130-153`

**Problem:** Tool groups flushed before a text, reasoning, authorization, or file part are always passed `isSettled={false}`. When the whole message later completes, those groups still receive `false`, so an unfinished `input-available`/approval state is never converted to `incomplete`. Only the final tool group uses `!showCaret`.

**Evidence:**

```tsx
// Do not settle tools just because text/reasoning followed them mid-turn.
flushTools(false);
// ...
flushTools(!showCaret);
```

**Proposed fix:** Separate “group boundary” from “message settled.” Pass the message's settled state to every emitted group on every render; while streaming it remains false, and once streaming ends all nonterminal calls become `incomplete`. Preserve grouping independently of status calculation.

### [P1] HITL responses can be submitted twice and freeform text is lost on failure

**Location:** `components/chat/message.tsx:755-806`

**Problem:** Response promises are deliberately discarded, no local submitting state disables the controls, and freeform text is cleared immediately. Fast double-clicks/Enter presses can send duplicate responses before parent state arrives. If sending fails, the parent shows an error but the user's typed response has already been erased.

**Evidence:**

```tsx
void onInputResponses([{ requestId: inputRequest.requestId, text }]);
setFreeformText("");
// ...
onClick={() => {
  void onInputResponses([
    {
      optionId: option.id,
      requestId: inputRequest.requestId,
    },
  ]);
}}
```

**Proposed fix:** Track `isSubmitting`, await one in-flight response, and disable all response controls until it settles. Clear freeform text only after confirmed success. Make the callback reject or return an explicit success result so this component can retain/re-enable the response on failure.

### [P1] Freeform HITL input has no accessible name

**Location:** `components/chat/message.tsx:790-803`

**Problem:** The input is identified only by a placeholder. Placeholder text is not a durable label and disappears after typing, leaving screen-reader and speech-input users without a reliable control name. A strict JSX accessibility configuration should flag this control.

**Evidence:**

```tsx
<Input
  disabled={!canRespond}
  onChange={(event) => setFreeformText(event.target.value)}
  // ...
  placeholder="Type a response"
  value={freeformText}
/>
```

**Proposed fix:** Add a real `<label>` tied to a stable `useId()` value (it may be visually hidden), or provide an `aria-labelledby` relationship to the request prompt.

### [P1] Composer blocks valid emoji-heavy messages at the wrong limit

**Location:** `components/chat/composer.tsx:15, 50-51, 104-116`; contextual validator: `lib/chat/limits.ts:1-5`

**Problem:** Application validation counts Unicode code points with `Array.from`, while the native `textarea maxLength` counts UTF-16 code units. A message containing astral characters such as emoji is therefore stopped by the browser well before the advertised 8,000-character application limit (roughly 4,000 emoji).

**Evidence:**

```tsx
const isOverMaxLength = getChatMessageLength(trimmedValue) > maxLength;
// ...
<textarea
  // ...
  maxLength={maxLength}
```

```ts
export function getChatMessageLength(message: string) {
  return Array.from(message).length;
}
```

**Proposed fix:** Remove the native `maxLength` or translate the intended policy to one consistent unit. Enforce and communicate the `getChatMessageLength` limit in the controlled `onChange`/validation path, with visible and announced remaining/error text.

### [P1] Enter submits while an IME composition is active

**Location:** `components/chat/composer.tsx:82-89`

**Problem:** The Enter handler does not check composition state. For CJK and other IME users, pressing Enter to confirm a candidate can instead prevent the composition event and submit an incomplete message.

**Evidence:**

```tsx
if (event.key === "Enter" && !event.shiftKey) {
  event.preventDefault();
  submitValue();
}
```

**Proposed fix:** Return early when `event.nativeEvent.isComposing` is true (and, for browser compatibility, when the relevant composition key code is reported). Add a composition-event test that confirms Enter does not submit until composition ends.

### [P1] Composer repeatedly steals focus when it is re-enabled

**Location:** `components/chat/composer.tsx:53-63, 104-105`

**Problem:** The focus effect depends on `textareaDisabled`. Every busy/preparing transition from true to false schedules a focus, potentially pulling focus away from a newly displayed HITL control, menu, or another user-selected control. The native `autoFocus` also duplicates initial focus behavior and is a `jsx-a11y/no-autofocus` lint concern.

**Evidence:**

```tsx
useEffect(() => {
  if (!autoFocus || textareaDisabled) {
    return;
  }

  const frame = window.requestAnimationFrame(() => {
    textareaRef.current?.focus({ preventScroll: true });
  });
  // ...
}, [autoFocus, textareaDisabled]);
// ...
<textarea
  autoFocus={autoFocus}
```

**Proposed fix:** Use one focus mechanism and constrain it to an intentional event (initial new-chat mount, or explicit user action), not every enabled-state transition. Default opt-in autofocus conservatively and do not move focus when another element already owns it.

### [P1] Payload truncation occurs only after full repeated serialization

**Location:** `components/chat/message.tsx:846-868, 695-718, 1197-1206`

**Problem:** `hasToolDetails` serializes both input and output merely to test whether they are nonempty, then `ToolPayload` serializes them again to render. `formatPayload` calls unrestricted `JSON.stringify` before applying the 4,000-character truncation. Large tool payloads therefore allocate and traverse the complete object multiple times on each relevant render, which can freeze the chat despite the short visible result.

**Evidence:**

```tsx
const hasInput = part.input !== undefined && formatPayload(part.input).trim().length > 0;
const hasOutput =
  part.state === "output-available" && formatPayload(part.output).trim().length > 0;
// ...
{formatPayload(value)}
```

```ts
try {
  return truncateText(JSON.stringify(value, null, 2), 4000);
} catch {
  return truncateText(String(value), 4000);
}
```

**Proposed fix:** Determine presence without serializing. Serialize once per `(toolCallId, state, input/output reference)` with a bounded serializer that caps depth, entries, string lengths, and output bytes during traversal rather than afterward. Pass the prepared strings into details/payload components.

### [P2] File message parts silently disappear

**Location:** `components/chat/message.tsx:173-189`

**Problem:** Eve's current `EveMessagePart` union includes file parts with filename, media type, size, and optional URL, but this renderer explicitly returns `null`. Any file-bearing message provides no filename, attachment chip, unsupported-state notice, or download affordance.

**Evidence:**

```tsx
case "dynamic-tool":
case "file":
  return null;
```

**Proposed fix:** Add a `FilePart` renderer that at minimum shows a safe filename/media type/size and an unavailable state. If URLs are rendered, validate protocols and use safe download/open behavior.

### [P2] Message-part dispatch is not compile-time exhaustive

**Location:** `components/chat/message.tsx:173-190`

**Problem:** The switch has no exhaustive `never` guard and no explicit unknown-part fallback. When Eve adds another part type, TypeScript can accept an implicit `undefined` return and the new content will silently vanish instead of creating a compile error or visible unsupported state.

**Evidence:**

```tsx
switch (part.type) {
  case "step-start":
    return null;
  // ...
  case "file":
    return null;
}
```

**Proposed fix:** Give the component an explicit `ReactNode` return type and end the switch with an `assertNever(part)` path. At runtime boundaries, validate incoming events and render a compact “Unsupported message part” diagnostic for unknown data.

### [P2] Every historical message component rerenders on each streamed update

**Location:** `components/chat/message.tsx:33-86`; contextual caller: `app/_components/ephemeral-agent-chat.tsx:333-343`

**Problem:** The parent maps the complete message list on each stream update, and `AgentMessage` is not memoized. Although the nested `Markdown` wrapper is memoized, every historical message still rebuilds its part/group tree, recalculates tool summaries/statuses, and can repeat payload work. Cost grows with conversation length.

**Evidence:**

```tsx
export function AgentMessage({
  // ...
}) {
  const lastTextIndex = message.parts.reduce(
    (last, part, index) => (part.type === "text" ? index : last),
    -1,
  );
  // ...
}
```

The contextual caller renders:

```tsx
{messages.map((message) => (
  <AgentMessage
    key={message.id}
    message={message}
    // ...
  />
))}
```

**Proposed fix:** Memoize `AgentMessage` and keep unchanged message/parts references stable in the reducer. Avoid passing the whole child-failure map to every row; derive the failures relevant to that message or use a selector. Profile a long conversation while streaming to verify the previous rows no longer render.

### [P2] Streaming text keeps an idle interval alive after catching up

**Location:** `components/chat/message.tsx:292-323`

**Problem:** The interval clears itself only when `catchUp` is true, which is defined as `!isStreaming`. While a stream is active, once `visibleTextRef.current === text`, the interval continues waking every 60 ms and doing no useful work until another prop update or stream completion.

**Evidence:**

```tsx
const catchUp = !isStreaming;
// ...
if (catchUp && next === text && interval !== undefined) {
  window.clearInterval(interval);
  interval = undefined;
}
// ...
interval = window.setInterval(advance, STREAM_TEXT_TICK_MS);
```

**Proposed fix:** Clear the interval whenever visible text reaches the current target. The next `text` prop update will rerun the effect and start another bounded reveal if needed. Prefer `requestAnimationFrame` or a single scheduled timeout for animation work.

### [P2] Non-expandable tool rows are focusable no-op buttons

**Location:** `components/chat/message.tsx:548-577`

**Problem:** `ToolCallItem` always creates a `<button>`, but when `canExpand` is false it renders that button outside a collapsible with no `onClick` and without `disabled`. Keyboard users can tab to and activate a control that performs no action.

**Evidence:**

```tsx
const button = (
  <button
    className={cn(/* ... */)}
    type="button"
  >
    // ...
  </button>
);

if (!canExpand) {
  return (
    <div className="py-0.5">
      {button}
```

**Proposed fix:** Render a noninteractive row (`div`/text) when there are no details, or make the button disabled and remove it from the tab order. Keep a button only for actual disclosure controls.

### [P2] Authorization challenge details and an explicit decline path are omitted

**Location:** `components/chat/message.tsx:207-234`

**Problem:** Eve exposes authorization `instructions` and `expiresAt`, but the renderer only uses URL and user code. Device-code or time-limited flows can therefore omit instructions the user needs. The component also offers no explicit skip/decline action, leaving “stop the whole response” as the only local escape when the user does not want to authorize.

**Evidence:**

```tsx
const url = part.authorization?.url;
const userCode = part.authorization?.userCode;
// ...
<p className="mt-1 text-muted-foreground">{part.description}</p>
{userCode ? (
  <p className="mt-2 font-mono text-xs text-foreground">{userCode}</p>
) : null}
```

**Proposed fix:** Render sanitized instructions, expiry state, and the user code as one accessible challenge. Extend the callback contract with a decline/skip action and provide a visible button that resolves or cancels the pending challenge without requiring a connection.

### [P2] Disabled-reason tooltip creates a semantically unnamed focus stop

**Location:** `components/chat/composer.tsx:159-170`

**Problem:** When disabled, the entire form is wrapped in a focusable generic `div` carrying `aria-label`. Generic containers are not reliably nameable, and there is no `aria-describedby` relationship to the tooltip content. Keyboard and screen-reader users can land on an extra focus stop without dependable semantics for why composing is unavailable.

**Evidence:**

```tsx
<TooltipTrigger asChild>
  <div aria-label={disabledReason} className="min-w-0" tabIndex={0}>
    {form}
  </div>
</TooltipTrigger>
<TooltipContent side="top">{disabledReason}</TooltipContent>
```

**Proposed fix:** Give the disabled explanation a stable ID and reference it from the textarea/form with `aria-describedby`. If a wrapper must be focusable for Radix, give it an appropriate semantic role and name; otherwise avoid adding a separate tab stop.

### [P3] Input-group addon focus behavior excludes textareas and is mouse-only

**Location:** `components/ui/input-group.tsx:58-76`

**Problem:** Clicking an addon searches only for an `input`, so the same primitive does nothing for `InputGroupTextarea`. The click behavior is placed on a `div role="group"` without a keyboard equivalent, which a strict `jsx-a11y/click-events-have-key-events` setup should report if the addon is treated as interactive.

**Evidence:**

```tsx
<div
  role="group"
  // ...
  onClick={(e) => {
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    e.currentTarget.parentElement?.querySelector("input")?.focus();
  }}
```

**Proposed fix:** Query the shared `[data-slot="input-group-control"]` target so inputs and textareas behave consistently. If the addon is meant to be an interactive focus proxy, use button/label semantics with keyboard behavior; otherwise keep it noninteractive and associate its text with the control.

## Lint-readiness summary

The current TypeScript check is clean, and the audited files contain no `any`, unused imports/variables, `console.*`, raw `<img>`, missing image `alt`, or unhandled promises that are not explicitly marked with `void`. The strict lint issues with concrete user impact are covered above: unlabeled HITL input, autofocus/focus stealing, the focusable generic disabled-reason wrapper, and the clickable input-group addon. No hook dependency omissions were found in the audited files.

Security checks found no direct `dangerouslySetInnerHTML`. The installed Streamdown 2.5.0 rendering path was verified to block Markdown/raw-HTML `javascript:` and `data:` links and images, and the installed code plugin rejects unknown or malicious Shiki language identifiers. The direct authorization anchor does not pass through those protections and remains the P0 issue above.

## Proposed split of message.tsx

- `components/chat/message.tsx` — keep the public `AgentMessage` shell and message-level layout from lines 1-86; import the dispatcher below.
- `components/chat/message-parts/message-parts.tsx` — move grouping/dispatch from lines 88-190 and replace `partKey` with stable, exhaustive part identity handling from lines 1227-1235.
- `components/chat/message-parts/authorization-part.tsx` — move `AuthorizationPart` from lines 192-239, including URL validation and challenge actions.
- `components/chat/message-parts/text-part.tsx` — move `UserTextPart`, `AssistantTextPart`, streaming cache/hook, and reveal helpers from lines 241-394.
- `components/chat/message-parts/reasoning-part.tsx` — move `ReasoningPart` from lines 396-424.
- `components/chat/tool-calls/tool-group.tsx` — move `ToolGroup`, `ToolCallItem`, status icon/name UI, and disclosure composition from lines 426-593 and 645-693.
- `components/chat/tool-calls/tool-details.tsx` — move `ToolDetails`, `ChildFailureList`, `ToolPayload`, and `InputRequestActions` from lines 595-643 and 695-815.
- `components/chat/tool-calls/tool-state.ts` — move `ToolStatus`, child-failure resolution, input/detail predicates, and status aggregation/labels from lines 817-945.
- `components/chat/tool-calls/tool-description.ts` — move group summaries, action descriptions, name/path formatting, and safe record readers from lines 947-1195.
- `components/chat/tool-calls/payload-format.ts` — replace the serialization/truncation helpers from lines 1197-1225 with a bounded, independently testable serializer.

Keep stateful UI components separate from pure helpers so status, description, identity, URL, and bounded-payload behavior can be unit-tested without mounting the full message renderer.
