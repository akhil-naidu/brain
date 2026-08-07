import { afterEach, describe, expect, it } from "vitest";
import { requireDatabaseUrl, resolveDatabaseUrl } from "@/lib/db/url";

describe("database URL helpers", () => {
  const previousBrain = process.env["BRAIN_DATABASE_URL"];
  const previousDatabase = process.env["DATABASE_URL"];

  afterEach(() => {
    if (previousBrain === undefined) {
      delete process.env["BRAIN_DATABASE_URL"];
    } else {
      process.env["BRAIN_DATABASE_URL"] = previousBrain;
    }
    if (previousDatabase === undefined) {
      delete process.env["DATABASE_URL"];
    } else {
      process.env["DATABASE_URL"] = previousDatabase;
    }
  });

  it("prefers BRAIN_DATABASE_URL over DATABASE_URL", () => {
    expect(
      resolveDatabaseUrl({
        BRAIN_DATABASE_URL: "postgres://brain:brain@localhost:5432/brain",
        DATABASE_URL: "postgres://other/other",
      }),
    ).toBe("postgres://brain:brain@localhost:5432/brain");
  });

  it("falls back to DATABASE_URL", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: "postgres://fallback/db",
      }),
    ).toBe("postgres://fallback/db");
  });

  it("returns null when unset", () => {
    expect(resolveDatabaseUrl({})).toBeNull();
  });

  it("requireDatabaseUrl fails clearly without SQLite fallback messaging", () => {
    delete process.env["BRAIN_DATABASE_URL"];
    delete process.env["DATABASE_URL"];
    expect(() => requireDatabaseUrl({})).toThrow(/BRAIN_DATABASE_URL/);
    expect(() => requireDatabaseUrl({})).toThrow(/docker compose/);
    expect(() => requireDatabaseUrl({})).not.toThrow(/sqlite/i);
  });
});
