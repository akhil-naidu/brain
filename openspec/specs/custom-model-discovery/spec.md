# custom-model-discovery Specification

## Purpose
Lets authorized admins discover installed model ids from an OpenAI-compatible or Ollama base URL so they can pick a provider model id when creating or editing a custom model.

## Requirements

### Requirement: Discover models for a base URL
An authorized admin (instance admin for any discovery used while managing instance models, or workspace owner/admin for workspace models) MUST be able to request discovery against a base URL and optional API key. The system MUST attempt Ollama-style tag listing and/or OpenAI-compatible model listing against that host and return a list of candidate provider model ids. Discovery MUST NOT persist custom models by itself.

#### Scenario: Ollama tags returned
- **WHEN** an authorized admin discovers against a reachable Ollama host (OpenAI-compatible `/v1` base or native host)
- **AND** Ollama reports installed tags
- **THEN** the response includes those model names as candidate ids

#### Scenario: OpenAI-compatible models list
- **WHEN** an authorized admin discovers against a host that implements OpenAI-compatible `GET /models`
- **THEN** the response includes model ids from that list when available

#### Scenario: Unreachable host
- **WHEN** discovery cannot reach the host or parses no models
- **THEN** the system returns a clear failure without creating a custom model

### Requirement: Discovery does not leak secrets
Discovery requests and responses MUST NOT echo the submitted API key. List responses MUST contain only non-secret model metadata (ids and optional display labels).

#### Scenario: Key not returned
- **WHEN** an admin submits an API key with a discovery request
- **THEN** the JSON response does not include that key value

### Requirement: Discovery is authorized
Unauthenticated callers MUST NOT discover models. Users who cannot manage custom models for the active scope MUST NOT call discovery successfully.

#### Scenario: Member denied
- **WHEN** a workspace member who is not an owner or admin requests discovery
- **THEN** the system rejects the request
