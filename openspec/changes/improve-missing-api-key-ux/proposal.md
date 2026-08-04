## Why

Without `COMMAND_CODE_API_KEY`, Brain’s chat fails with opaque provider errors. Operators need a clear setup message before and after a failed turn.

## What Changes

- Same-origin setup check that reports whether the Command Code API key is configured (boolean only; never return the key).
- Empty-state / composer guidance when the key is missing.
- Map common provider auth failures to the same clear setup instructions.

## Capabilities

### New Capabilities

- `provider-setup-ux`: Clear local guidance when Command Code credentials are missing or rejected.

### Modified Capabilities

- (none)

## Impact

- New `/api/setup` route
- Chat empty state + composer disabled reason
- Error message normalization helper + tests
