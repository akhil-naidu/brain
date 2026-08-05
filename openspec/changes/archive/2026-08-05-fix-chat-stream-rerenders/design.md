## Approach

eve's message reducer already preserves object identity for untouched messages when upserting the active turn. Brain leans on that:

1. `React.memo(AgentMessageView, areAgentMessagePropsEqual)` skips settled rows when only parent callbacks / unused failure maps churn
2. Chat shell exposes forever-stable `onInputResponses` / `onEditResend` via refs
3. `childFailuresByCallId` is only passed to the last message (the only row that can gain mid-turn child failures)

## Non-goals

Virtualized lists, deep structural message equality, React Compiler migration
