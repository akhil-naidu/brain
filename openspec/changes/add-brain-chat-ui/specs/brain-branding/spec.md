## Purpose

Defines Brain product naming and visual identity for the chat UI: geometric straight-line brain mark and teal/navy accents on template-like chrome.

## ADDED Requirements

### Requirement: Product is named Brain
The chat application MUST present the product name "Brain" in the document title and primary chrome (sidebar/header brand area).

#### Scenario: Title and brand text
- **WHEN** a user opens the chat UI
- **THEN** the document title and brand chrome identify the product as Brain

### Requirement: Geometric straight-line brain mark
The UI MUST display a brain mark built from straight line segments (tech/circuit feel), used at least as favicon and sidebar/brand icon. The primary silhouette MUST NOT be a soft organic curved-only icon.

#### Scenario: Favicon and sidebar mark
- **WHEN** the chat UI loads
- **THEN** the favicon and brand mark show the geometric Brain artwork

### Requirement: Teal-navy primary theme
The UI MUST use a deep teal/navy primary accent on neutral surfaces. It MUST NOT rely on a purple-on-white gradient theme as the default brand look.

#### Scenario: Primary accent reads teal-navy
- **WHEN** a user views primary actions or focus rings
- **THEN** the accent color family is teal/navy rather than purple-default AI styling
