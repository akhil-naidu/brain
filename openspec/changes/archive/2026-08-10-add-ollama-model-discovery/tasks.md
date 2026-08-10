## 1. Discovery helper + API

- [x] 1.1 Add pure helpers to normalize base URL and parse Ollama `/api/tags` + OpenAI `/models` JSON into candidate ids (with tests)
- [x] 1.2 Implement bounded server fetch (timeout, size limit, http(s) only) used by discovery
- [x] 1.3 Add `POST /api/models/discover` gated like custom-model manage (workspace owner/admin or instance admin); never echo API key

## 2. Models UI

- [x] 2.1 Add Fetch models control to Add/Edit dialog; wire candidates into provider model id selection while keeping manual input
- [x] 2.2 Show clear empty/error states when discovery fails

## 3. Verify

- [x] 3.1 Unit tests for parsers + authz smoke as appropriate
- [x] 3.2 Run `pnpm run verify` clean
