import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import { resolveAuthDbPath } from "@/lib/auth/users-path";
import { createWorkspaceStore, type WorkspaceStore } from "@/lib/auth/workspaces/store";

type SqlRow = Record<string, null | number | bigint | string | Uint8Array>;

const bootstrapSignupGate = new AsyncLocalStorage<"bootstrap" | "open" | "invite">();

function resolveAuthSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = env["BETTER_AUTH_SECRET"]?.trim();
  if (secret) {
    return secret;
  }
  if (
    env["VITEST"] ||
    env["NODE_ENV"] === "test" ||
    process.env["VITEST"] ||
    process.env["NODE_ENV"] === "test"
  ) {
    return "test-only-better-auth-secret-32chars!!";
  }
  throw new Error("Missing BETTER_AUTH_SECRET. Generate one with: openssl rand -base64 32");
}

function resolveAuthBaseURL(env: Record<string, string | undefined> = process.env): string {
  return (
    env["BETTER_AUTH_URL"]?.trim() || env["BRAIN_PUBLIC_URL"]?.trim() || "http://localhost:3000"
  );
}

function countFromRow(row: SqlRow | undefined): number {
  const value = row?.["count"];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return 0;
}

function createBrainAuth(env: Record<string, string | undefined> = process.env) {
  const dbPath = resolveAuthDbPath(env);
  if (dbPath !== ":memory:") {
    mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  const secret = resolveAuthSecret(env);
  const baseURL = resolveAuthBaseURL(env);

  const auth = betterAuth({
    database: db,
    secret,
    baseURL,
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      disableSignUp: false,
      autoSignIn: true,
    },
    databaseHooks: {
      user: {
        create: {
          before: async () => {
            const gate = bootstrapSignupGate.getStore();
            if (gate === "bootstrap" || gate === "open" || gate === "invite") {
              return;
            }
            // Lazy policy check for Better Auth client sign-up (no ALS gate).
            const workspaces = createWorkspaceStore(db);
            if (workspaces.getPolicies().signupMode === "open") {
              return;
            }
            throw new APIError("FORBIDDEN", {
              message:
                "Signup is disabled. Use an invite or ask the instance admin to enable open signup.",
            });
          },
          after: async (user) => {
            const workspaces = createWorkspaceStore(db);
            const policies = workspaces.getPolicies();
            if (policies.autoPersonalWorkspace && user.id) {
              const personal = workspaces.ensurePersonalWorkspace(user.id);
              if (!workspaces.getActiveWorkspaceId(user.id)) {
                workspaces.setActiveWorkspaceId(user.id, personal.id);
              }
            }
          },
        },
      },
    },
    plugins: [nextCookies()],
  });

  const ready = getMigrations(auth.options).then(async ({ runMigrations }) => {
    await runMigrations();
    createWorkspaceStore(db);
    return undefined;
  });

  const ensureBootstrapClaimTable = () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS brain_bootstrap_claim (
        id INTEGER PRIMARY KEY CHECK (id = 1)
      );
    `);
  };

  let workspaceStore: WorkspaceStore | undefined;

  return {
    auth,
    db,
    ready,
    workspaces() {
      workspaceStore ??= createWorkspaceStore(db);
      return workspaceStore;
    },
    countUsers() {
      try {
        const row = db.prepare("SELECT COUNT(*) AS count FROM user").get() as SqlRow | undefined;
        return countFromRow(row);
      } catch {
        return 0;
      }
    },
    firstUserId() {
      try {
        const row = db.prepare("SELECT id FROM user ORDER BY createdAt ASC LIMIT 1").get() as
          SqlRow | undefined;
        const id = row?.["id"];
        return typeof id === "string" && id.trim() ? id : null;
      } catch {
        return null;
      }
    },
    /** Single-row claim so parallel /setup cannot create two first users. */
    claimFirstBootstrap() {
      ensureBootstrapClaimTable();
      try {
        db.prepare("INSERT INTO brain_bootstrap_claim (id) VALUES (1)").run();
        return true;
      } catch {
        return false;
      }
    },
    releaseBootstrapClaim() {
      try {
        ensureBootstrapClaimTable();
        db.prepare("DELETE FROM brain_bootstrap_claim WHERE id = 1").run();
      } catch {
        // ignore
      }
    },
  };
}

type BrainAuthBundle = ReturnType<typeof createBrainAuth>;

const globalForAuth = globalThis as typeof globalThis & {
  brainAuthBundle?: BrainAuthBundle;
  brainAuthBundleKey?: string;
};

function authBundleKey(env: Record<string, string | undefined>): string {
  return `${resolveAuthDbPath(env)}|${resolveAuthBaseURL(env)}`;
}

function getBrainAuthBundle(
  env: Record<string, string | undefined> = process.env,
): BrainAuthBundle {
  const key = authBundleKey(env);
  if (!globalForAuth.brainAuthBundle || globalForAuth.brainAuthBundleKey !== key) {
    globalForAuth.brainAuthBundle = createBrainAuth(env);
    globalForAuth.brainAuthBundleKey = key;
  }
  return globalForAuth.brainAuthBundle;
}

export function getAuth(env: Record<string, string | undefined> = process.env) {
  return getBrainAuthBundle(env).auth;
}

export async function ensureAuthReady(
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  await getBrainAuthBundle(env).ready;
}

export function countAuthUsers(env: Record<string, string | undefined> = process.env): number {
  return getBrainAuthBundle(env).countUsers();
}

export function firstAuthUserId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return getBrainAuthBundle(env).firstUserId();
}

export async function runWithBootstrapSignup<T>(fn: () => Promise<T>): Promise<T> {
  return bootstrapSignupGate.run("bootstrap", fn);
}

export async function runWithOpenSignup<T>(fn: () => Promise<T>): Promise<T> {
  return bootstrapSignupGate.run("open", fn);
}

export async function runWithInviteSignup<T>(fn: () => Promise<T>): Promise<T> {
  return bootstrapSignupGate.run("invite", fn);
}

export function getWorkspaceStore(
  env: Record<string, string | undefined> = process.env,
): WorkspaceStore {
  return getBrainAuthBundle(env).workspaces();
}

export function claimFirstBootstrap(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return getBrainAuthBundle(env).claimFirstBootstrap();
}

export function releaseBootstrapClaim(env: Record<string, string | undefined> = process.env): void {
  getBrainAuthBundle(env).releaseBootstrapClaim();
}

/** Test helper: replace the in-process auth singleton. */
export function resetBrainAuthForTests(): void {
  delete globalForAuth.brainAuthBundle;
  delete globalForAuth.brainAuthBundleKey;
}
