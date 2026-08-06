# Agent runtime and MCP OAuth audit

Audit date: 2026-07-30

Scope: `agent/agent.ts`, `agent/channels/eve.ts`, `agent/sandbox.ts`,
`agent/instructions.md`, `agent/lib/mcp-oauth.ts`,
`agent/lib/define-mcp-oauth-connection.ts`, and the ClickUp, Slack, Asana, and
Gmail connection definitions.

Framework ground truth was taken from the installed `eve` 0.27.6 docs and type
declarations. `npm run typecheck` passes. The reviewed model and sandbox
configuration use direct Command Code and pinned microsandbox respectively; no
forbidden Vercel infrastructure was found. `.eve` and `.env*` are ignored by
`.gitignore`.

### [P0] Public callers share unrestricted agent and OAuth access

**Location:** `agent/channels/eve.ts:4-14`

**Problem:** The channel authenticator accepts every request, regardless of
origin, credential, or deployment mode, and maps every caller to the same
user principal. If this app is reachable by an untrusted caller, that caller
can start model runs and use the same principal-keyed Slack, Gmail, Asana, and
ClickUp credentials as the operator. The warning comment does not enforce the
claimed local/trusted boundary.

**Evidence:**

```ts
/** Local/trusted open access — not for public internet without a real AuthFn. */
const anonymousUser: AuthFn<Request> = () => ({
  // ...
  principalId: "anonymous",
  principalType: "user",
});

export default eveChannel({
  auth: [anonymousUser],
```

Eve documents that route auth is the HTTP boundary and does not add a second
session-ownership ACL (`node_modules/eve/docs/guides/auth-and-route-protection.md:243-254`).
It also documents that user-scoped connection credentials are keyed by issuer
and principal id (`node_modules/eve/dist/src/runtime/connections/types.d.ts:185-192`).
Here those values are identical for every request.

**Proposed fix:** Replace the unconditional authenticator with a real
self-hosted `AuthFn` (JWT/OIDC, Better Auth session, or API key) that returns a
stable, distinct user principal. If anonymous local mode is required, gate it
on an explicit development flag and a loopback-host check equivalent to
`localDev()`, and fail closed otherwise. Add per-session/user authorization if
multiple users can access continuation and stream routes.

### [P1] OAuth callbacks accept a missing state parameter

**Location:** `agent/lib/define-mcp-oauth-connection.ts:68-95`

**Problem:** The callback rejects `state` only when the provider returned a
non-empty value. A callback containing a code but omitting `state` passes the
check and is exchanged. This weakens the OAuth CSRF/session-binding control.
The early cached-token return also occurs before any callback validation.

**Evidence:**

```ts
const existing = await getStoredAccessToken(provider, principal);
if (existing) {
  return { token: existing.token, expiresAt: existing.expiresAt };
}

// ...
if (
  callback.params.state &&
  resume.state &&
  callback.params.state !== resume.state
) {
  throw new ConnectionAuthorizationFailedError(/* ... */);
}
```

The implementation correctly generates 128 random bits at
`agent/lib/define-mcp-oauth-connection.ts:49`, but does not require the returned
value.

**Proposed fix:** Validate `resume` and callback errors/state before consulting
the token cache. Require `callback.params.state` to exist and exactly equal the
journaled state; reject both missing and mismatched values with a terminal,
stable reason such as `invalid_state`. A constant-time comparison is a
reasonable defense-in-depth improvement.

### [P1] OAuth tokens and client secrets are written world-readable

**Location:** `agent/lib/mcp-oauth.ts:48-76`

**Problem:** Access tokens, refresh tokens, and dynamically registered client
secrets are stored as plaintext using default filesystem modes. On the audited
machine, `.eve` was `drwxr-xr-x` and
`.eve/mcp-oauth-clickup.json` was `-rw-r--r--`, so other local users can read
the credentials. Gitignore prevents accidental commits but does not provide
host-level secrecy.

**Evidence:**

```ts
await mkdir(path.dirname(storePath(name)), { recursive: true });
await writeFile(storePath(name), `${JSON.stringify(store, null, 2)}\n`, "utf8");
```

No `mode`, `chmod`, encryption, or external secret-store boundary is applied.

**Proposed fix:** Create the directory with mode `0o700`, write through an
exclusive temporary file with mode `0o600`, atomically rename it, and enforce
the final mode with `chmod` for pre-existing files. For multi-user or hosted
deployments, move grants to an encrypted database/secret store keyed by
provider and principal rather than the project working tree.

### [P1] Expired grants always force full browser consent

**Location:** `agent/lib/mcp-oauth.ts:85-95`

**Problem:** The code persists `refreshToken` but never uses it. Once an access
token enters the 60-second expiry window, `getStoredAccessToken` returns
`null`, causing `getToken` to start a new interactive authorization. Gmail and
other expiring providers therefore repeatedly require browser consent, and
refresh-token rotation is not handled.

**Evidence:**

```ts
if (entry.expiresAt && entry.expiresAt <= Date.now() + 60_000) {
  return null;
}
```

`StoredToken.refreshToken` is populated at
`agent/lib/mcp-oauth.ts:232-246`, but there is no refresh-token grant request
anywhere in the audited implementation.

**Proposed fix:** Add a refresh path before returning `null`: serialize refresh
per provider/principal, POST `grant_type=refresh_token` with the correct client
authentication and resource, validate the response, preserve the old refresh
token when none is returned, replace it when rotation occurs, and atomically
persist the result. On `invalid_grant`, delete the stale grant and start
interactive authorization.

### [P1] Revoked unexpired tokens cannot be evicted from persistent storage

**Location:** `agent/lib/define-mcp-oauth-connection.ts:39-46`

**Problem:** The custom authorization provider has a persistent cache but does
not implement Eve's `evict` hook. When the MCP server rejects an unexpired
bearer, Eve can clear its per-step cache, but the next `getToken` reads the same
rejected token from disk. Reauthorization cannot make progress until expiry or
manual file deletion.

**Evidence:**

```ts
auth: defineInteractiveAuthorization<McpOAuthResume>({
  async getToken({ principal }) {
    const cached = await getStoredAccessToken(provider, principal);
    // ...
  },
```

The installed Eve type contract explicitly says lower-layer caches should
implement `evict`, otherwise reauthorization re-reads the same revoked
credential (`node_modules/eve/dist/src/runtime/connections/types.d.ts:225-248`).

**Proposed fix:** Add a principal-scoped `deleteStoredToken` operation and
provide `evict({ principal })` on the interactive authorization definition.
Make deletion atomic and coordinated with refresh/exchange writes.

### [P1] Token endpoint responses can leak credentials through error reasons

**Location:** `agent/lib/mcp-oauth.ts:236-239`,
`agent/lib/define-mcp-oauth-connection.ts:117-127`

**Problem:** A failed or malformed token response is serialized in full into
an exception. The helper then copies that complete message into
`ConnectionAuthorizationFailedError.reason`. If a provider returns any token,
secret, or sensitive diagnostic field alongside an error, it is exposed in the
authorization event/failed tool result rather than remaining server-side.

**Evidence:**

```ts
throw new Error(
  `${provider.displayName} token exchange failed: ${String(json.error_description ?? json.error ?? response.status)} (${JSON.stringify(json)})`,
);
```

```ts
const message =
  error instanceof Error ? error.message : "token_exchange_failed";
throw new ConnectionAuthorizationFailedError(provider.name, {
  reason: message,
```

Eve specifies that `reason` appears on the authorization event and failed tool
result (`node_modules/eve/docs/connections/overview.mdx:224-229`).

**Proposed fix:** Never include the raw token response in a thrown or
user-visible error. Map failures to stable codes such as
`token_exchange_failed`, `invalid_client`, or `invalid_grant`. If diagnostics
are logged server-side, redact token/secret/code fields and include only status,
provider, and a bounded provider error code.

### [P2] Store updates are race-prone and all read failures look like an empty store

**Location:** `agent/lib/mcp-oauth.ts:61-76`, `agent/lib/mcp-oauth.ts:98-105`,
`agent/lib/mcp-oauth.ts:129-161`

**Problem:** Every update is an unlocked read-modify-write directly to the
final JSON file. Concurrent authorization, registration, refresh, or future
multi-user writes can overwrite each other. A crash during `writeFile` can
leave partial JSON, and `readStore` catches parse errors, permission failures,
and I/O errors indiscriminately as an empty store; the next write then silently
discards all prior clients and grants.

**Evidence:**

```ts
} catch {
  return { clients: {}, tokens: {} };
}
```

```ts
const store = await readStore(provider.name);
store.tokens[principalKey(principal)] = token;
await writeStore(provider.name, store);
```

**Proposed fix:** Serialize updates per store (and use an inter-process lock if
multiple processes are supported), write and `fsync` a same-directory
temporary file, then atomically rename. Treat `ENOENT` as an empty store but
surface malformed JSON, permission, and other I/O errors without overwriting
the original. A transactional database is preferable for multi-instance
deployments.

### [P2] OAuth network requests have no deadline and trust unvalidated JSON

**Location:** `agent/lib/mcp-oauth.ts:133-150`,
`agent/lib/mcp-oauth.ts:209-236`

**Problem:** Dynamic registration and token exchange call `fetch` without an
abort signal or timeout, so a stalled provider can hold an authorization
durable step indefinitely. Both paths cast arbitrary JSON to expected shapes;
registration parses before checking status, and malformed/non-JSON error
responses lose the useful HTTP failure context.

**Evidence:**

```ts
const response = await fetch(provider.registrationEndpoint, {
  method: "POST",
  // no signal
});
const body = (await response.json()) as {
  client_id?: string;
  // ...
};
```

The token path similarly uses `as Record<string, unknown>` rather than runtime
validation.

**Proposed fix:** Pass a bounded `AbortSignal.timeout(...)` (or combine a
deadline with the runtime cancellation signal when Eve exposes one here).
Check status/content type, read a bounded body, and validate success/error
payloads with Zod before using them. Return stable timeout and malformed
response reasons.

### [P2] Best-effort browser launch can crash headless Linux

**Location:** `agent/lib/mcp-oauth.ts:270-284`

**Problem:** `spawn()` reports command-not-found through an asynchronous
`"error"` event, not the surrounding synchronous `try/catch`. If `xdg-open`
(or another platform opener) is absent, the unhandled child-process error can
terminate Node even though browser opening is documented as best-effort.

**Evidence:**

```ts
try {
  // ...
  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
} catch {
  // Browser open is best-effort.
}
```

A read-only Node reproduction during this audit printed from inside the `try`,
then terminated with `Unhandled 'error' event` and `spawn ... ENOENT`.

**Proposed fix:** Retain the returned child, attach a no-throw `"error"`
listener before calling `unref()`, and optionally skip launching when no
graphical session/opener is available. The challenge URL and file should remain
the reliable fallback.

### [P2] Write approval depends on an incomplete name heuristic

**Location:** `agent/lib/define-mcp-oauth-connection.ts:26-27`,
`agent/lib/define-mcp-oauth-connection.ts:131-132`

**Problem:** All four evolving remote tool catalogs share a regex that assumes
every side-effecting tool name contains one of a fixed set of verbs. Mutating
verbs such as `modify`, `remove`, `archive`, `upload`, `share`, or
provider-specific names are not matched and would execute without approval.
Conversely, harmless names containing `start` can be gated. This is not a
stable security boundary as providers add or rename tools.

**Evidence:**

```ts
const WRITE_TOOL_HINT =
  /(create|update|edit|post|send|add|set|write|comment|assign|move|complete|start|stop|log|delete|invite|schedule)/i;

approval: ({ toolName }) =>
  WRITE_TOOL_HINT.test(toolName) ? "user-approval" : "not-applicable",
```

Eve passes the qualified remote tool name and raw tool input to this policy
(`node_modules/eve/docs/connections/mcp.mdx:146-185`), so a more precise policy
is supported.

**Proposed fix:** Maintain provider-specific allowlists of known read-only
tools and fail closed (require approval) for unknown tools, or maintain reviewed
write-tool sets generated from each MCP catalog. Use `toolInput` for operations
whose effect depends on arguments, and add catalog snapshot tests so newly
introduced tools cannot silently bypass the gate.
