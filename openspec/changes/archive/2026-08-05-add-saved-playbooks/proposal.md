## Why

Users repeat the same work asks. Built-in welcome chips help once; personal playbooks let people save and rerun their own prompts from empty chat and the composer.

## What Changes

- Store named playbooks in browser local storage (label + prompt)
- Empty-state “Your playbooks” list with add/edit/delete/run
- Composer bookmark menu to run or manage playbooks
- Cap at a small number of saved playbooks

## Capabilities

### New Capabilities

- `saved-playbooks`: User-defined reusable chat prompts

### Modified Capabilities

- _(none)_

## Impact

- `lib/chat/playbooks.ts`, playbook UI components, `ephemeral-agent-chat` wiring
