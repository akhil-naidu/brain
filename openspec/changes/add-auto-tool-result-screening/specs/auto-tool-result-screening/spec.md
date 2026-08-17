## Purpose

Screens tool outputs after execution so Auto and Strict turns do not feed prompt-injection or secret-like payloads into the model, while Dangerous skips that check.

## ADDED Requirements

### Requirement: Screen tool results in Auto and Strict
When instance agent safety posture is `auto` or `strict`, the system MUST screen each tool result after the tool has executed and MUST NOT pass a matching payload to the model. Unattended scheduled runs MUST screen even when stored posture is `dangerous`. Screening MUST run on interactive Auto/Strict turns and on unattended scheduled runs. Command-policy denials that never execute MUST NOT require screening.

#### Scenario: Auto screens an injected ticket body
- **WHEN** posture is `auto` and a connection read returns text that tells the model to ignore previous instructions
- **THEN** the model does not receive that payload and receives a short blocked stub instead

#### Scenario: Strict still screens after the human approved the call
- **WHEN** posture is `strict`, the user approved a tool call, and the tool result contains an injection phrase
- **THEN** the model does not receive that payload

#### Scenario: Scheduled run still screens
- **WHEN** a morning-brief or playbook schedule run receives a tool result that matches screening
- **THEN** the model does not receive that payload even though the run is unattended

#### Scenario: Dangerous schedule still screens
- **WHEN** instance posture is `dangerous` and a scheduled playbook run receives a tool result that matches screening
- **THEN** the model does not receive that payload (unattended runs keep Auto-like screening so they are not unprotected)

### Requirement: Dangerous skips result screening
When instance agent safety posture is `dangerous` and the turn is interactive, the system MUST NOT screen tool results for injection or secret-like leakage. Command policy MUST still deny matching *calls* before execute. Ask and Plan omit/deny MUST still apply.

#### Scenario: Dangerous delivers a matching payload to the model
- **WHEN** posture is `dangerous` on an interactive Agent turn and a tool result contains an injection phrase that Auto would have blocked
- **THEN** screening does not replace that payload for the model

### Requirement: Matches become a stub, never an approval prompt
When screening matches, the system MUST replace the tool result with a short reason that the output was blocked. The blocked call MUST NOT become an in-chat approval prompt. Screening MUST NOT undo side effects that already happened.

#### Scenario: Blocked output is not HITL
- **WHEN** screening matches a bash or connection result
- **THEN** the turn does not wait for the user to approve or reject that output, and the model sees only the stub

#### Scenario: Harmless listing is not blocked
- **WHEN** bash returns ordinary directory listing text with no injection phrase and no secret-like token
- **THEN** screening does not replace the result

### Requirement: Heuristic catalog for injection and secrets
Screening MUST match at least: instructions to ignore previous/prior instructions; attempts to install a new system prompt or role; and common secret-like material (PEM private keys, AWS access key ids, GitHub PATs, Slack bot tokens). Matching MUST be case-insensitive for the injection phrases. The catalog MUST live in Brain code (not an operator-edited list in this change).

#### Scenario: Ignore-previous-instructions is blocked
- **WHEN** a tool result contains `Ignore previous instructions` in any common casing
- **THEN** screening matches and the model receives the stub

#### Scenario: PEM private key is blocked
- **WHEN** a tool result contains a `BEGIN` / `PRIVATE KEY` PEM block
- **THEN** screening matches and the model receives the stub

#### Scenario: Normal task text is not blocked
- **WHEN** a ClickUp (or similar) read returns a task title such as `Follow up with prior instructions from legal`
- **THEN** screening does not match solely because the words `prior` and `instructions` appear apart from an ignore/override phrase
