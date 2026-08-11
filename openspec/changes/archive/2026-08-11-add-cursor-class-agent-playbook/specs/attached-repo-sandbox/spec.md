## MODIFIED Requirements

### Requirement: Prefer local checkout when attached
When a repo is attached, Agent instructions MUST tell the model to prefer harness tools under `/workspace` for code changes and to use GitHub MCP for remote PR/issue operations. Those instructions MUST also include an explicit coding playbook: explore the checkout with read/search/shell tools, make focused edits with write tools, run available verification commands when reasonable, and summarize what changed. Instructions MUST NOT claim IDE features (open editors, language servers, inline apply).

#### Scenario: Agent guidance mentions attached repo
- **WHEN** a turn includes an attached repo in client context
- **THEN** dynamic Agent instructions reference working in the sandbox checkout

#### Scenario: Agent guidance includes coding playbook
- **WHEN** a turn includes an attached repo in client context and the turn is Agent mode
- **THEN** dynamic Agent instructions include explore, edit, verify, and summarize guidance plus GitHub MCP reserved for remote operations
