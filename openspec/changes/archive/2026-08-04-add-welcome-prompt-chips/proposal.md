## Why

An empty chat gives little guidance. Short starter prompts help users begin without inventing the first question.

## What Changes

- Show a small set of welcome prompt suggestions on the empty chat state (when chat is ready to send).
- Clicking a suggestion starts that prompt through the normal send path.
- Hide suggestions when the Command Code API key is missing (setup guidance stays primary).

## Capabilities

### New Capabilities

- `welcome-prompt-chips`: Starter prompts on the empty chat state.

### Modified Capabilities

- (none)

## Impact

- Empty-state UI in agent chat
- Suggestion list helper + tests
- Non-goals: personalized/LLM-generated suggestions, analytics
