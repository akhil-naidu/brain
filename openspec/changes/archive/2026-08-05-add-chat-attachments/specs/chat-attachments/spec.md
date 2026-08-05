## ADDED Requirements

### Requirement: Attach files in the composer
The chat composer MUST let the user attach supported files (images, PDF, and common text files) before sending a turn, including via file picker, image paste, and drag-and-drop when available.

#### Scenario: Add an attachment from the picker
- **WHEN** the user chooses a supported file from the attach control
- **THEN** the composer shows that file as a pending attachment that can be removed before send

#### Scenario: Reject unsupported or oversized files
- **WHEN** the user tries to attach an unsupported type or a file over the size limit
- **THEN** the system does not add it and shows a clear error

### Requirement: Send text with attachments
Sending a turn with pending attachments MUST deliver them to the agent as multipart user content (text parts when present, plus file parts with data URLs).

#### Scenario: Send text and files together
- **WHEN** the user submits a message that includes text and at least one pending attachment
- **THEN** the agent receive path includes both the text and the file parts

#### Scenario: Send attachments without text
- **WHEN** the user submits with one or more attachments and an empty text field
- **THEN** the turn still sends using the file parts
