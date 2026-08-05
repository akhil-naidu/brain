## ADDED Requirements

### Requirement: Settled messages skip stream-driven re-renders

While a turn is streaming, settled chat message rows MUST NOT re-render solely because the parent chat shell recreated action callbacks or replaced an unused child-failure map reference. The active streaming message MAY re-render as its projected parts update.

#### Scenario: Historical row stays put during token stream

- **WHEN** an assistant message is streaming tokens into the latest message
- **THEN** earlier messages with unchanged projections do not re-render their markdown/tool trees because of parent callback identity changes
