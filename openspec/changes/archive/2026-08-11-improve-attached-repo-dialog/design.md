## Context

v1 shipped a composer popover for attach. Clone still happens in the Agent sandbox only. Users need clearer UX for private repos and URL vs fields without a separate page.

## Goals / Non-Goals

**Goals:**
- Dialog UX with URL paste and Owner/Repo/Branch fields (synced)
- GitHub status strip + link to Tools for private access
- Composer chip remains the trigger

**Non-Goals:**
- Multi-repo favorites library / separate repos page
- Listing all GitHub repos from the API (later)
- Changing clone or cleanup semantics

## Decisions

### Dialog over page
Attach is per-chat; keep it in chat. Tools stays the place to connect GitHub.

### Dual input, one model
Paste updates fields; editing fields updates the normalized display. Submit uses `parseAttachedRepo` / field builder.

### Private repo messaging
When GitHub is not `connected`, show: connect GitHub in Tools for private clones and GitHub tools. Public attach still allowed.

## Risks / Trade-offs

- [Status fetch fails] → Show soft “Check Tools” without blocking public attach

## Open Questions

None for this change.
