## MODIFIED Requirements

### Requirement: Channel principal matches signed-in user
For Brain browser chat, the eve channel AuthFn MUST resolve `principalType` user and a stable `principalId` from the authenticated Brain session so MCP OAuth and approvals attach to that user. Token and approval lookup for workspace-scoped grants MUST use the session’s **active workspace** together with that principal.

#### Scenario: Turn uses session principal
- **WHEN** a signed-in user starts a chat turn that needs a connection token
- **THEN** the agent looks up tokens and approvals for that user’s principal id in the active workspace, not `anonymous` and not another workspace’s grants

#### Scenario: Workspace context on turn
- **WHEN** the signed-in user’s active workspace is W
- **THEN** MCP grant resolution for the turn uses workspace W
