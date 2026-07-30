# Library and tooling audit

Audit date: 2026-07-30

Scope: the five requested `lib/` modules and their callers, repository
configuration, dependency health, TypeScript strictness, and a proposed
lint/format/test/CI gate. This audit was read-only except for this report and
temporary TypeScript configs, which were deleted after measurement.

Verification notes:

- Baseline `npx tsc --noEmit` completed with 0 errors.
- `npm ls --depth=0` reported a valid top-level tree.
- `npm outdated` was run; results are summarized below.
- `.env` and `.env.example` are ignored and are not tracked in the current
  index or any reachable commit. Secret values were not copied into this
  report.
- The shell used for the audit was Node 22.22.2, while `.nvmrc` and
  `package.json` require Node 24. CI and implementation work should use Node 24.

## Part A — lib/ logic findings

### [P1] Child-event processing becomes quadratic within a long turn

**Location:** `lib/chat/subagent-child-failures.ts:74-76,83-100,185`

**Problem:** Every appended parent event changes `eventsSig`, then the effect
slices from the current turn start and scans the entire turn again. For a turn
with `n` streamed events, total work is O(n²). `seenCalledRef` avoids duplicate
subscriptions but not repeated traversal. The two collections and failure
arrays are also bounded only by the next `turn.started`; one unusually long
turn can grow them without a cap.

**Evidence:** The eve store appends every authoritative event to its `events`
array. The hook reruns on each append and loops over
`currentEvents.slice(turnStartIndex)`. Cleanup at lines 88-96 occurs only when
the numeric start index changes.

**Proposed fix:** Track the last processed event index and current `turnId`,
process only the appended suffix, and reset by turn identity rather than array
index. Add a documented per-call/per-turn failure cap (for example, the newest
20 failures per call and 100 calls per turn) or delete settled entries once
their UI no longer needs them.

### [P1] Message-length contract is inconsistent and only client-enforced

**Location:** `lib/chat/limits.ts:1-20`; callers
`components/chat/composer.tsx:50-51,65-72,104-116`

**Problem:** `Array.from(message).length` counts Unicode code points, while the
textarea's native `maxLength` counts UTF-16 code units. An emoji generally
counts as one to `getChatMessageLength` but two to the browser, so users can be
stopped around half of the advertised 8,000-character limit. Combining marks
and multi-code-point emoji also do not match user-perceived graphemes.
`assertChatMessageLength` has no caller, so the limit is UI-only and can be
bypassed by another client or future call site.

**Evidence:** The composer passes `maxLength={maxLength}` at line 110 but uses
`getChatMessageLength` for its own guard. Repository search found no call to
`assertChatMessageLength`.

**Proposed fix:** Define the unit explicitly. For user-visible “characters,”
use `Intl.Segmenter` with `granularity: "grapheme"` and remove native
`maxLength` (or maintain a separate UTF-16-safe input guard). Apply the same
shared validator at the final send/server boundary, not only in the component.
Test 7,999/8,000/8,001 boundaries, astral emoji, combining marks, and ZWJ emoji.

### [P2] Title truncation can split emoji and exceed the intended unit

**Location:** `lib/chat/title.ts:16-17`

**Problem:** `String.length` and `slice` operate on UTF-16 code units. Slicing
at 69 can leave an unpaired surrogate, producing a replacement character, and
the 72-unit result does not represent 72 user-perceived characters.

**Evidence:** `truncateTitle` uses `title.length` and `title.slice(0, 69)`.

**Proposed fix:** Segment by grapheme with `Intl.Segmenter`, take 69 complete
clusters, trim trailing whitespace, and append `...`. Keep the 72-grapheme
contract in a named constant and test emoji/ZWJ/combining sequences.

### [P2] Disabled connections are advisory, not an enforced capability boundary

**Location:** `lib/chat/connection-context.ts:13-22`; callers
`app/_components/ephemeral-agent-chat.tsx:239-265`

**Problem:** The helper only adds natural-language instructions to
`clientContext`; all connection tools remain available to the model. A model
mistake or prompt injection can still use a UI-disabled connection, so the
toggle's apparent contract is stronger than its implementation.

**Evidence:** Both send paths pass only a string `clientContext`; no caller
filters the connection/tool set. The plan at
`docs/superpowers/plans/2026-07-30-06-connections-menu.md:65-99` confirms this
was the intended implementation, but it is not hard enforcement.

**Proposed fix:** Enforce enabled connection IDs in the backend capability/tool
selection path for the turn. Until eve exposes that boundary, label the toggle
as a model preference rather than a security control and retain the prompt as
defense in depth.

### [P2] Child-stream failures are silently swallowed

**Location:** `lib/chat/subagent-child-failures.ts:111-158`

**Problem:** The catch block ignores every exception, not only the expected
`AbortError`. Authentication failures, invalid child session IDs, protocol
changes, and network errors therefore produce no row and no diagnostic,
masking regressions.

**Evidence:** The catch at lines 152-153 has no error parameter or abort check.

**Proposed fix:** Ignore only abort-related errors. Report other failures via a
bounded synthetic child failure, logger, or caller-provided error callback,
without exposing sensitive response bodies.

### [P3] Remote child-session metadata is ignored

**Location:** `lib/chat/subagent-child-failures.ts:101-120`

**Problem:** The eve `subagent.called` event includes optional `remote.url`,
but the hook always creates a same-origin `Client({ host: "" })`. The current
repository has no authored subagents, so this is latent, but the exported hook
will not extend coherently to remote subagents.

**Evidence:** Only `callId`, `childSessionId`, and `name` are destructured.
Installed eve 0.27.6 declares `remote?: { url: string }` in
`node_modules/eve/dist/src/protocol/message.d.ts:210-224`.

**Proposed fix:** Resolve and validate the child host from event metadata (or
document that remote subagents are unsupported) and key cached clients by
trusted origin.

### [P3] Failure labels accept blank values and collapse repeated failures

**Location:** `lib/chat/subagent-child-failures.ts:17-44,137-149`

**Problem:** Nullish fallback preserves `""` and whitespace-only error
messages/tool names, yielding blank UI. Deduplication by `(toolName, message)`
also collapses repeated failures and loses occurrence count.

**Evidence:** Empty strings pass the `typeof === "string"` checks, and
`existing.some(...)` returns the previous map for a repeated pair.

**Proposed fix:** Trim and reject blank labels, use stable fallbacks, and either
retain each event ID/sequence or store `{ count, lastSeen }` for duplicates.

### [P3] Fallback-title cleanup removes meaningful punctuation globally

**Location:** `lib/chat/title.ts:3-7`

**Problem:** `/[`*_#>]/g` strips characters wherever they occur, changing
meaningful text such as `C#`, comparisons, identifiers, and multiplication,
instead of only removing leading Markdown decoration.

**Evidence:** The replacement is global and context-free. The caller uses the
result as the first-message chat title at
`app/_components/brain-chat-shell.tsx:25-27`.

**Proposed fix:** Remove only well-defined leading Markdown constructs, or
prefer normalized plain input without punctuation stripping. Add examples for
`C#`, `a*b`, `_name`, blockquotes, and headings.

### [P3] Length error text is locale-dependent

**Location:** `lib/chat/limits.ts:7-12`

**Problem:** `toLocaleString()` makes the exact error message vary by runtime
locale, complicating deterministic tests, logs, and hydration if server and
client locales differ.

**Evidence:** No locale is supplied at line 12.

**Proposed fix:** Use a fixed locale such as `en-US`, a literal `8,000`, or
format the number only at the UI layer with an explicitly selected locale.

No correctness or purity finding was found in `lib/utils.ts:1-6`; `cn` is a
small, side-effect-free composition of `clsx` and `tailwind-merge`.

## Part B — config & hygiene findings

### [P1] `microsandbox` is incorrectly classified as development-only

**Location:** `package.json:49-55`; runtime use `agent/sandbox.ts:1-7`

**Problem:** Production is explicitly pinned to the microsandbox backend, but
the package is in `devDependencies`. A production install using
`npm ci --omit=dev` omits it and eve documents that production then fails with
an actionable missing-package error.

**Evidence:** `npm explain microsandbox` reports it as the root dev dependency
and eve's optional peer. Eve 0.27.6 docs state that the microsandbox npm package
is not bundled and production processes fail if it is missing.

**Proposed fix:** Move `microsandbox` to `dependencies` while keeping the
pinned non-Vercel backend. Verify with `npm ci --omit=dev && npm run build`.

### [P1] The requested ESLint type-aware stack does not support TypeScript 7

**Location:** `package.json:38,55`; proposed tooling boundary

**Problem:** Current `typescript-eslint` 8.65.0 declares
`typescript >=4.8.4 <6.1.0`, while this repo pins TypeScript 7.0.2.
`eslint-config-next@16.2.6` depends on `typescript-eslint ^8.46.0`, so the
incompatibility is inherited even if `typescript-eslint` is not installed
directly. Suppressing the peer error would create an unsupported gate.

**Evidence:** `npm view typescript-eslint peerDependencies` and
`npm view @typescript-eslint/parser peerDependencies` both returned the
`<6.1.0` ceiling. `eslint-config-next@16.2.6` accepts TypeScript `>=3.3.1` at
its own surface but depends on the incompatible parser suite.

**Proposed fix:** Use the verified TS7-native Oxlint fallback in Part C now.
Adopt the target ESLint configuration only after a stable typescript-eslint
release includes TypeScript 7 in its peer range and the config passes on this
repo without peer overrides.

### [P2] Broad TypeScript include scans generated eve snapshots

**Location:** `tsconfig.json:34-44`

**Problem:** `include: ["**/*.ts", "**/*.tsx"]` reaches ignored generated
content under `.eve/dev-runtime/snapshots`, not only authored source. It also
automatically opts future TypeScript files under `docs/`, `openspec/`, and
`.cursor/` into the app project.

**Evidence:** There are currently 431 `.ts`/`.tsx` files under `.eve` and zero
under `docs/`, `openspec/`, and `.cursor`. With `skipLibCheck: false`, generated
snapshot declarations accounted for 30 of 33 measured diagnostics.

**Proposed fix:** Replace the catch-all with explicit authored roots such as
`app/**/*.ts(x)`, `components/**/*.ts(x)`, `lib/**/*.ts(x)`, `agent/**/*.ts`,
and config files; explicitly exclude `.eve`, `.next`, `docs`, `openspec`, and
`dist`. Keep only the precise generated declaration paths Next/eve require.

### [P2] `skipLibCheck` masks 33 diagnostics and generated-path casing issues

**Location:** `tsconfig.json:12-18`

**Problem:** `skipLibCheck: true` hides dependency declaration problems and,
because of the broad include, generated snapshots with differently cased
workspace paths. Turning it off currently produces 33 diagnostics.

**Evidence:** Measured errors were 20 `TS1149` path-casing duplicates, 10
missing generated route declaration imports, two missing `json-schema`
declarations, and one missing `type-fest` declaration.

**Proposed fix:** Narrow the project first, then resolve the remaining three
dependency declaration errors before considering `skipLibCheck: false`.
Do not flip this flag in the same commit as lint adoption.

### [P2] Two useful strictness flags expose 26 real errors

**Location:** `tsconfig.json:2-33`

**Problem:** `noUnusedParameters` and `exactOptionalPropertyTypes` are absent.
The former finds two unused component props; the latter finds 24 places where
“omitted” and “present with `undefined`” are incorrectly conflated.

**Evidence:** Isolated measurements: `noUnusedParameters` = 2 errors and
`exactOptionalPropertyTypes` = 24 errors. The other requested flags each
produced zero errors.

**Proposed fix:** Enable the zero-error flags immediately:
`noUncheckedIndexedAccess`, `noImplicitOverride`,
`noFallthroughCasesInSwitch`, `noUnusedLocals`, `verbatimModuleSyntax`, and
`forceConsistentCasingInFileNames`. Fix and enable `noUnusedParameters` next,
then adopt `exactOptionalPropertyTypes` in a focused commit.

### [P2] Environment template is ignored and unavailable to fresh clones

**Location:** `.gitignore:2`; `.env.example:1-22`

**Problem:** `.env*` safely ignores `.env` but also ignores `.env.example`.
The example is not tracked, so a fresh clone does not receive setup
documentation.

**Evidence:** `git check-ignore -v` points both files to `.gitignore:2`, and
`git ls-files` returns neither file.

**Proposed fix:** Keep `.env*` and add `!.env.example`, then intentionally
track the value-free template after checking it contains placeholders only.

### [P2] The `#evals/*` package import points to no directory

**Location:** `package.json:5-8`

**Problem:** `#evals/*` maps to `./evals/*`, but no `evals/` directory exists
and no repository import uses the alias.

**Evidence:** Filesystem glob and import search both returned zero matches.

**Proposed fix:** Remove the stale mapping until evals are added, or add the
documented directory and a smoke eval in the same change.

### [P2] Four direct Shiki dependencies are unused

**Location:** `package.json:24-26,42`

**Problem:** `@shikijs/core`, `@shikijs/engine-javascript`,
`@shikijs/engine-oniguruma`, and `shiki` have no direct imports. The used
`@streamdown/code` package installs its own Shiki 3.23.0 subtree, while these
root packages install a separate 4.3.1 tree.

**Evidence:** Source import search found no match. `npm explain` showed the root
4.3.1 packages only through the root `shiki`, separate from
`@streamdown/code`'s Shiki 3.23.0.

**Proposed fix:** Remove the four root declarations together and verify
`npm run build` plus code-block rendering. Keep `@streamdown/code`.

### [P3] The `ai` override is redundant with the direct dependency and eve peer

**Location:** `package.json:32,57-59`

**Problem:** The root already declares `ai ^7.0.34`, and eve 0.27.6 requests
the same peer range. The override adds no currently observed resolution
constraint and obscures ownership.

**Evidence:** `npm explain ai` reports one root instance used by the root and
eve peer; no conflicting transitive version exists.

**Proposed fix:** Remove only the override, retain direct `ai` to satisfy eve's
runtime peer, regenerate the lockfile, and verify `npm ls ai`.

### [P3] Several dependencies have compatible updates available

**Location:** `package.json:22-55`

**Problem:** The lockfile is behind compatible releases for
`@ai-sdk/openai`, `@types/react`, `ai`, `eve`, `next`, `react`, and
`react-dom`. `@types/node` and `microsandbox` also have newer major versions.

**Evidence:** `npm outdated` reported wanted versions:
`@ai-sdk/openai 4.0.24`, `@types/react 19.2.17`, `ai 7.0.42`,
`eve 0.27.13`, `next 16.2.12`, and React/React DOM 19.2.8. npm's “latest”
value for eve was anomalously `0.5.4`, lower than the installed line, so it
must not be treated as an upgrade target.

**Proposed fix:** Update compatible patch/minor releases in a dedicated
dependency PR and run the full gate. Review major updates
(`@types/node` 26, microsandbox 0.6) separately.

### [P3] No automated quality gate exists

**Location:** `package.json:9-20`; repository root

**Problem:** There is a typecheck script but no lint, format check, tests, or
CI; `.github/` does not exist.

**Evidence:** Script and filesystem inspection.

**Proposed fix:** Implement Part C in staged commits and make `npm run verify`
the local and CI gate.

### [P3] Current shell bypasses the declared Node version

**Location:** `.nvmrc:1`; `package.json:60-62`

**Problem:** The repository consistently requires Node 24, but the audit shell
was Node 22.22.2. npm only warns on an engine mismatch, so local commands can
silently run under an unsupported runtime.

**Evidence:** `node --version` returned `v22.22.2`; `.nvmrc` is `24`.

**Proposed fix:** Use `nvm use`/the team's version manager before development,
and pin CI with `node-version-file: .nvmrc`. Optionally add a non-destructive
preflight script that fails with a clear message on the wrong major.

No P0 secret-tracking issue was found. `.env` contains values under the
variable names `COMMAND_CODE_API_KEY` and `CLICKUP_API_TOKEN`, but `.env` is
ignored, absent from the index, and absent from reachable git history.
Generated artifacts `.next`, `.eve`, `dist`, `.output`, `.nitro`, and
`*.tsbuildinfo` are all correctly ignored. No forbidden Vercel production
integration was found in the reviewed configuration.

No imported external package was found missing from `package.json`. `zod` and
`ai` have no direct source import in the audited roots but must remain direct
runtime dependencies because they satisfy AI SDK/eve peer contracts.
`@tailwindcss/postcss`, Tailwind, and the Streamdown plugins are used by config,
CSS, or component code.

## Part C — lint/format/test/CI plan

### Compatibility decision

Do **not** force-install ESLint's type-aware TypeScript stack today.
`typescript-eslint@8.65.0` does not support TypeScript 7.0.2 in its real peer
range, and `eslint-config-next@16.2.6` brings that package transitively.

The immediate supported gate should be:

- Oxlint 1.76.0 with `oxlint-tsgolint` 7.0.2001. Its stable type-aware engine
  explicitly tracks TypeScript 7.0.2.
- Native `react` (including hooks), `jsx-a11y`, `nextjs`, `typescript`,
  `import`, and `promise` plugins.
- Prettier 3.9.6 with the Tailwind CSS v4 class-sorting plugin.
- Vitest 4.1.10; add Testing Library and happy-dom for the hook test.

Exact supported install command:

```sh
npm install -D oxlint@^1.76.0 oxlint-tsgolint@^7.0.2001 prettier@^3.9.6 prettier-plugin-tailwindcss@^0.8.1 vitest@^4.1.10 @testing-library/react@^16.3.2 happy-dom@^20.11.1
```

Recommended `oxlint.config.ts`:

```ts
import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    perf: "error",
    suspicious: "error",
  },
  env: {
    browser: true,
    node: true,
  },
  ignorePatterns: [
    ".next/**",
    ".eve/**",
    "node_modules/**",
    "dist/**",
    ".output/**",
    ".nitro/**",
    "docs/**",
    "openspec/**",
    "next-env.d.ts",
  ],
  options: {
    denyWarnings: true,
    reportUnusedDisableDirectives: "error",
    typeAware: true,
  },
  plugins: [
    "eslint",
    "typescript",
    "react",
    "import",
    "jsx-a11y",
    "nextjs",
    "promise",
  ],
  settings: {
    react: {
      version: "19.2",
    },
  },
});
```

Keep the explicit CLI flag as a second line of defense:
`oxlint --deny-warnings .`.

### Target ESLint 9 flat config after TypeScript 7 support lands

Next 16 no longer runs lint during `next build`; lint must be a separate gate.
The verified Next 16 integration is to spread
`eslint-config-next/core-web-vitals` and
`eslint-config-next/typescript` in a flat config. `core-web-vitals` already
loads React, React Hooks, JSX a11y, and Next rules. React Hooks 7.1.1 supports
ESLint 9 and React 19; its stable recommended preset includes compiler rules.
Do not add `recommended-latest`, which adds experimental rules.

Re-check this peer dependency before installing:

```sh
npm view typescript-eslint peerDependencies
```

Only when it includes TypeScript 7, use:

```sh
npm install -D eslint@^9.39.5 eslint-config-next@^16.2.6 typescript-eslint@^8.65.0 eslint-plugin-react-hooks@^7.1.1 eslint-plugin-jsx-a11y@^6.10.2 eslint-config-prettier@^10.1.8 prettier@^3.9.6 prettier-plugin-tailwindcss@^0.8.1 vitest@^4.1.10 @testing-library/react@^16.3.2 happy-dom@^20.11.1
```

The `typescript-eslint` version in that command is the current placeholder;
replace it with the first stable version whose peer range supports TS 7.
Do not use `--force`, `--legacy-peer-deps`, or a peer override.

Target `eslint.config.mjs`:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  eslintConfigPrettier,
  globalIgnores([
    ".next/**",
    ".eve/**",
    "node_modules/**",
    "dist/**",
    ".output/**",
    ".nitro/**",
    "docs/**",
    "openspec/**",
    "next-env.d.ts",
  ]),
]);
```

This scopes project-service typed rules to `.ts`/`.tsx`; it does not need the
expensive `allowDefaultProject` escape hatch for `eslint.config.mjs`.
`eslint-config-prettier/flat` is last among rule configs so formatting rules
cannot conflict with Prettier.

### Formatter

Recommend Prettier rather than Biome or ESLint stylistic rules. This repo has
many long Tailwind class lists; the official Tailwind plugin understands the
v4 stylesheet and `cn`/`cva` calls. Prettier is orthogonal to either the
immediate Oxlint gate or future ESLint gate, which avoids another migration
when TypeScript ESLint catches up.

`prettier.config.mjs`:

```js
/** @type {import("prettier").Config & import("prettier-plugin-tailwindcss").PluginOptions} */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
  printWidth: 100,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  tailwindFunctions: ["cn", "cva"],
  tailwindStylesheet: "./app/globals.css",
};

export default config;
```

`.prettierignore`:

```gitignore
.next
.eve
node_modules
dist
.output
.nitro
docs
openspec
package-lock.json
next-env.d.ts
```

Keep `package-lock.json` out of formatter churn; npm owns its serialization.
Docs/OpenSpec are excluded to keep the initial formatting commit focused.

### Scripts

Immediate Oxlint scripts:

```json
{
  "scripts": {
    "lint": "oxlint --deny-warnings .",
    "lint:fix": "oxlint --fix --deny-warnings .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify": "npm run format:check && npm run lint && npm run typecheck && npm test"
  }
}
```

After supported ESLint adoption, change only:

```json
{
  "lint": "eslint . --max-warnings=0",
  "lint:fix": "eslint . --fix --max-warnings=0"
}
```

The formatter check runs first because it is fastest to fix; tests run last.
Both lint variants make any warning fail the gate.

### Tests

Use Vitest rather than `node:test`. Vitest 4 supports ESM, Node 24, TypeScript
source transforms, mocking the eve client, React 19, and per-file DOM
environments. `node:test` would require a separate TS transform and more manual
React hook harness work.

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  test: {
    coverage: {
      include: ["lib/**/*.ts"],
      reporter: ["text", "json-summary"],
    },
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
```

Do not add a coverage threshold in the first commit; add one after the initial
suite establishes a truthful baseline. Highest-value initial targets:

1. `lib/chat/limits.ts` — `getChatMessageLength` and
   `getChatMessageLengthError`: 7,999/8,000/8,001 boundaries, trimming,
   surrogate pairs, combining sequences, and ZWJ emoji.
2. `lib/chat/limits.ts` — `assertChatMessageLength`: does not throw at the
   boundary and throws the same stable message one over it.
3. `lib/chat/title.ts` — `createFallbackTitle`: blank input, whitespace
   collapse, meaningful punctuation, exactly-at-limit input, and complete
   grapheme truncation.
4. `lib/chat/connection-context.ts` —
   `createConnectionClientContext`: all enabled, all disabled, mixed states,
   deterministic order, and no mutation of the input object.
5. `lib/utils.ts` — `cn`: later Tailwind classes win, falsey values disappear,
   and variant inputs compose correctly.
6. `lib/chat/subagent-child-failures.ts` — extract a pure event reducer/cursor
   and test turn reset, duplicate call IDs, repeated failure counting, terminal
   cleanup, and configured caps.
7. `lib/chat/subagent-child-failures.ts` — with
   `// @vitest-environment happy-dom`, mock `eve/client` and verify unmount,
   parent settle, and turn transition abort child streams; verify non-abort
   errors surface.
8. `app/_components/brain-chat-shell.tsx` — one focused React test that the
   first accepted user message sets a title once and “New chat” resets it.

### CI

`.github/` does not currently exist. Add
`.github/workflows/verify.yml`:

```yaml
name: Verify

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run verify
```

No Vercel account, project, credential, or hosted service is required.

### Adoption order

1. Fix `.gitignore` so `.env.example` is tracked safely; move
   `microsandbox` to runtime dependencies; remove the stale `#evals/*` alias.
2. Narrow `tsconfig` include/exclude patterns so generated `.eve` snapshots are
   outside the project.
3. Enable the six zero-error strictness flags, then separately fix the two
   `noUnusedParameters` errors.
4. Add Vitest and the pure-function tests; make `npm test` green.
5. Add Prettier/Tailwind config, apply formatting in one mechanical commit, and
   make `format:check` green.
6. Add Oxlint/tsgolint TS7 config, fix all findings until
   `oxlint --deny-warnings .` reports zero errors and zero warnings.
7. Add `verify`, then the minimal GitHub Actions workflow; require the check on
   pull requests.
8. In focused follow-ups, adopt `exactOptionalPropertyTypes`, remove unused
   Shiki dependencies and the redundant `ai` override, then address
   `skipLibCheck`.
9. When typescript-eslint officially supports TS 7, replace Oxlint only if the
   Next/React-specific coverage is materially better; use the target flat
   config and keep `--max-warnings=0`.
