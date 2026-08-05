# read-aloud-message Specification

## Purpose
Lets users hear an assistant reply read aloud in the browser.
## Requirements
### Requirement: Read aloud on assistant messages
When the browser supports speech synthesis and an assistant message has spoken text, the UI MUST offer a Read aloud control after the reply has finished streaming.

#### Scenario: Read aloud appears for a completed assistant reply
- **WHEN** speech synthesis is available and an assistant message has text
- **AND** the message is not streaming
- **THEN** that message provides a Read aloud control

#### Scenario: Read aloud hidden without speech support or text
- **WHEN** speech synthesis is unavailable or the message has no spoken text
- **THEN** Read aloud is not offered

### Requirement: Stop while speaking
While a message is being read aloud, the control MUST let the user stop playback. Starting Read aloud on a message MUST cancel any in-progress speech first.

#### Scenario: Stop ends playback
- **WHEN** the user activates Stop while a reply is being read
- **THEN** speech playback ends
