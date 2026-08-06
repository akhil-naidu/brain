## ADDED Requirements

### Requirement: Owner can share an existing personal chat
In a team workspace, the owner of a personal chat MUST be able to change that chat’s visibility to shared. After sharing, all workspace members MUST be able to list and open it. Non-owners MUST NOT share another user’s personal chat. Sharing MUST be rejected in personal workspaces.

#### Scenario: Owner shares personal chat
- **WHEN** the owner of a personal chat in a team workspace sets visibility to shared
- **THEN** the chat becomes shared and appears for other workspace members

#### Scenario: Non-owner cannot share
- **WHEN** another workspace member attempts to share someone else’s personal chat
- **THEN** the system rejects the request
