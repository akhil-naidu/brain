## 1. Matcher

- [x] 1.1 Add `evaluateToolResultScreening` (stringify + 256 KiB cap, injection phrases, PEM / AKIA / GitHub PAT / Slack token patterns)
- [x] 1.2 Add `shouldScreenToolResults({ posture, unattended })` (Auto/Strict or unattended; skip interactive Dangerous only)
- [x] 1.3 Unit tests: injection hit, PEM hit, negative “prior instructions from legal”, Dangerous interactive skip helper, unattended Dangerous still screens

## 2. Harness execute wrap

- [x] 2.1 After `defaultTool.execute` in `gateHarnessTool`, replace matching output with the screening stub (including tools with no HITL `kind`, e.g. `read_file` / `web_fetch`)
- [x] 2.2 Extend or add harness tests so Auto bash/web_fetch matching output is stubbed and harmless listing is unchanged

## 3. Model wrap for MCP

- [x] 3.1 Wrap every LanguageModel from `createCommandCodeFallbackModel` / `resolveChatModelSelection` with AI SDK `wrapLanguageModel` (no AI Gateway) so tool-result parts are screened before generate/stream
- [x] 3.2 Tests for the prompt rewrite: matching tool-result content becomes the stub; Dangerous interactive path leaves content; custom-model resolve path is also wrapped

## 4. Docs

- [x] 4.1 Document Auto/Strict result screening vs Dangerous skip, unattended still screens, stub never HITL, on instance-policies, approvals, security, and glossary

## 5. Verify

- [x] 5.1 `pnpm run openspec:validate` and `pnpm run verify`
