-- Separate database for Vitest so `pnpm test` / `pnpm verify` cannot wipe local dev auth data.
-- This file runs only on first volume init (empty data directory).
CREATE DATABASE brain_test;
