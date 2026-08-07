## Purpose

Defines how Brain uses operator-provided Postgres as the durable system of record for auth, workspaces, chats, and related product data, without requiring a Vercel-hosted database product.

## ADDED Requirements

### Requirement: Postgres connection required
The system MUST read a Postgres connection URL from configuration (`DATABASE_URL` or `BRAIN_DATABASE_URL`) and use that database for durable product data. The system MUST NOT require Neon, Supabase, Vercel Postgres, Upstash, or other hosted-only database products. Any standard Postgres the operator provides MUST be acceptable.

#### Scenario: Configured URL is used
- **WHEN** the operator sets a valid Postgres connection URL and starts Brain
- **THEN** auth, workspace, and chat persistence use that database

#### Scenario: Missing URL fails clearly
- **WHEN** Brain starts without a Postgres connection URL in non-test configuration
- **THEN** startup fails with a clear configuration error naming the required variable

### Requirement: Schema applied on startup
The system MUST ensure required Postgres tables and indexes exist when the app becomes ready (Better Auth schema plus Brain-owned tables for workspaces, chats, playbooks, schedules, and related data). Operators MUST NOT need a separate manual migration step for a fresh empty database beyond providing the connection URL.

#### Scenario: Fresh database becomes usable
- **WHEN** Brain connects to an empty Postgres database on first start
- **THEN** required schema is applied and bootstrap / sign-in / chat APIs can operate

### Requirement: Unreachable database fails clearly
When Postgres is configured but unreachable at runtime for a persistence operation, the system MUST fail the request (or startup probe) with a clear error and MUST NOT silently fall back to SQLite files under `.eve/`.

#### Scenario: No SQLite fallback
- **WHEN** Postgres is configured and the connection fails
- **THEN** the system does not create or use `.eve/brain-auth.sqlite` or `.eve/brain-chats.sqlite` as a fallback store
