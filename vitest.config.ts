import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Force tests onto a dedicated DB. Never inherit BRAIN_DATABASE_URL from `.env`
 * (that points at local `brain` and TRUNCATE would wipe the operator account).
 * Override with BRAIN_TEST_DATABASE_URL when needed (CI may point at `brain`).
 */
const testDatabaseUrl =
  process.env["BRAIN_TEST_DATABASE_URL"]?.trim() ||
  "postgres://brain:brain@127.0.0.1:5432/brain_test";
process.env["BRAIN_DATABASE_URL"] = testDatabaseUrl;
process.env["DATABASE_URL"] = testDatabaseUrl;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    globals: false,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    env: {
      BRAIN_DATABASE_URL: testDatabaseUrl,
      DATABASE_URL: testDatabaseUrl,
    },
    // Integration tests share a single Postgres instance; run files serially to
    // prevent concurrent TRUNCATE / INSERT races across test files.
    fileParallelism: false,
  },
});
