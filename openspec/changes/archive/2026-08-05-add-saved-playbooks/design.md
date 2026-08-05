## Context

Welcome chips are static. Model preference already uses localStorage; playbooks follow the same trust model (this browser on a trusted Brain host).

## Decisions

1. **localStorage** — fast, no API; keyed `brain.playbooks.v1`.
2. **Run = send** — activating a playbook submits through the normal composer path.
3. **Empty state + composer** — discover on empty chat; rerun anytime from the bookmark menu.
4. **Limit 12** — keep the menu usable.

## Non-goals

- Host-synced multi-device vault
- Sharing playbooks across users
- Scheduling playbooks
