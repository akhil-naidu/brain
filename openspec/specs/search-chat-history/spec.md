# search-chat-history Specification

## Purpose
Lets users filter the sidebar chat history by title so they can find a saved conversation quickly.
## Requirements
### Requirement: Title search in the sidebar
The chat sidebar MUST provide a search control that filters the list of persisted chats by title. Matching MUST be case-insensitive and treat the query as a substring of the title.

#### Scenario: Matching chats remain visible
- **WHEN** the user enters a query that matches one or more chat titles
- **THEN** only those matching chats are listed in the sidebar history

#### Scenario: Non-matching chats are hidden
- **WHEN** the user enters a query that does not match a chat title
- **THEN** that chat is not listed while the query is active

### Requirement: Empty search results state
When a non-empty search query matches no chats, the sidebar MUST show a clear empty-results message instead of the full chat list.

#### Scenario: No matches
- **WHEN** the user enters a non-empty query with no title matches
- **THEN** the UI indicates that no chats matched

#### Scenario: Clearing the query restores the list
- **WHEN** the user clears the search query
- **THEN** the full persisted chat list is shown again

