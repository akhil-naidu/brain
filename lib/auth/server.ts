import { AsyncLocalStorage } from "node:async_hooks";
import type { Pool } from "pg";
import { scim } from "@better-auth/scim";
import { sso } from "@better-auth/sso";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import { sendPasswordResetEmail } from "@/lib/auth/email/smtp";
import { assertCanCreateUser, resolveLicenseEntitlements } from "@/lib/auth/license";
import { workspaceIdFromScimProviderId } from "@/lib/auth/scim/provider-id";
import {
  createWorkspaceStore,
  ensureWorkspaceSchema,
  type WorkspaceStore,
} from "@/lib/auth/workspaces/store";
import { isWorkspaceAdminRole } from "@/lib/auth/workspaces/types";
import type { DbRow } from "@/lib/db/rows";
import { getPool } from "@/lib/db/pool";
import { requireDatabaseUrl } from "@/lib/db/url";

const bootstrapSignupGate = new AsyncLocalStorage<"bootstrap" | "open" | "invite">();

/** Survives ALS loss across Next/Better Auth async boundaries (and duplicate module copies). */
const globalForSignupGate = globalThis as typeof globalThis & {
  brainSignupGate?: "bootstrap" | "open" | "invite";
};

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

function countFromRow(row: Record<string, unknown> | undefined): number {
  const value = row?.["count"];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function createBrainAuth(env: Record<string, string | undefined> = process.env) {
  const pool = getPool(env);
  const secret = resolveAuthSecret(env);
  const baseURL = resolveAuthBaseURL(env);

  async function countUsers(): Promise<number> {
    try {
      const result = await pool.query<DbRow>(`SELECT COUNT(*)::int AS count FROM "user"`);
      return countFromRow(result.rows[0]);
    } catch {
      return 0;
    }
  }

  async function hasActiveBootstrapClaim(): Promise<boolean> {
    try {
      const result = await pool.query(`SELECT id FROM brain_bootstrap_claim WHERE id = 1`);
      return Boolean(result.rows[0]);
    } catch {
      return false;
    }
  }

  let wsStore: WorkspaceStore | undefined;

  function getWsStore(): WorkspaceStore {
    wsStore ??= createWorkspaceStore(pool);
    return wsStore;
  }

  const auth = betterAuth({
    database: pool,
    secret,
    baseURL,
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      disableSignUp: false,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail({
          to: user.email,
          resetUrl: url,
        });
      },
    },
    account: {
      accountLinking: {
        enabled: true,
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/request-password-reset") {
          return;
        }
        const policies = await getWsStore().getPolicies();
        if (!policies.allowForgotPassword) {
          throw new APIError("FORBIDDEN", {
            message: "Forgot password is disabled on this host.",
          });
        }
        if (policies.signupMode === "sso-only") {
          throw new APIError("FORBIDDEN", {
            message: "Password reset is not available when this host is SSO-only.",
          });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async () => {
            const gate = bootstrapSignupGate.getStore() ?? globalForSignupGate.brainSignupGate;
            const userCount = await countUsers();

            const bootstrapAllowed =
              gate === "bootstrap" || ((await hasActiveBootstrapClaim()) && userCount === 0);
            if (bootstrapAllowed && userCount === 0) {
              return;
            }

            try {
              const entitlements = await resolveLicenseEntitlements();
              assertCanCreateUser(entitlements, userCount);
            } catch (error) {
              throw new APIError("FORBIDDEN", {
                message:
                  error instanceof Error ? error.message : "User limit reached for this license.",
              });
            }

            if (gate === "open" || gate === "invite") {
              return;
            }

            const signupMode = (await getWsStore().getPolicies()).signupMode;
            if (signupMode === "open" || signupMode === "sso-only") {
              return;
            }
            throw new APIError("FORBIDDEN", {
              message:
                "Signup is disabled. Use an invite, SSO (when allowed), or ask the instance admin to enable open signup.",
            });
          },
          after: async (user) => {
            const workspaces = getWsStore();
            const policies = await workspaces.getPolicies();
            if (policies.autoPersonalWorkspace && user.id) {
              const personal = await workspaces.ensurePersonalWorkspace(user.id);
              if (!(await workspaces.getActiveWorkspaceId(user.id))) {
                await workspaces.setActiveWorkspaceId(user.id, personal.id);
              }
            }
          },
        },
      },
      account: {
        create: {
          after: async (account) => {
            const providerId = typeof account.providerId === "string" ? account.providerId : "";
            const userId = typeof account.userId === "string" ? account.userId : "";
            const workspaceId = workspaceIdFromScimProviderId(providerId);
            if (!workspaceId || !userId) {
              return;
            }
            const workspaces = getWsStore();
            const workspace = await workspaces.getWorkspace(workspaceId);
            if (!workspace || workspace.kind !== "team") {
              return;
            }
            if (!(await workspaces.getMembership(workspaceId, userId))) {
              await workspaces.addMember(workspaceId, userId, "member");
            }
            if (!(await workspaces.getActiveWorkspaceId(userId))) {
              await workspaces.setActiveWorkspaceId(userId, workspaceId);
            }
          },
        },
        delete: {
          after: async (account) => {
            const providerId = typeof account.providerId === "string" ? account.providerId : "";
            const userId = typeof account.userId === "string" ? account.userId : "";
            const workspaceId = workspaceIdFromScimProviderId(providerId);
            if (!workspaceId || !userId) {
              return;
            }
            const workspaces = getWsStore();
            try {
              await workspaces.removeMember({
                workspaceId,
                actorUserId: userId,
                targetUserId: userId,
              });
            } catch {
              // Last owner / already removed — ignore.
            }
          },
        },
      },
    },
    plugins: [
      nextCookies(),
      sso({
        providersLimit: 0,
        domainVerification: {
          enabled: true,
        },
        organizationProvisioning: {
          disabled: true,
        },
        provisionUserOnEveryLogin: true,
        provisionUser: async ({ user, provider }) => {
          const workspaceId = provider.organizationId?.trim();
          if (!workspaceId || !user.id) {
            return;
          }
          const workspaces = getWsStore();
          const workspace = await workspaces.getWorkspace(workspaceId);
          if (!workspace || workspace.kind !== "team") {
            return;
          }
          if (!(await workspaces.getMembership(workspaceId, user.id))) {
            await workspaces.addMember(workspaceId, user.id, "member");
          }
          if (!(await workspaces.getActiveWorkspaceId(user.id))) {
            await workspaces.setActiveWorkspaceId(user.id, workspaceId);
          }
        },
      }),
      scim({
        providerOwnership: { enabled: false },
        storeSCIMToken: "hashed",
        linkExistingUsers: true,
        canGenerateToken: async ({ user, providerId, organizationId }) => {
          if (organizationId) {
            return false;
          }
          const workspaceId = workspaceIdFromScimProviderId(providerId);
          if (!workspaceId) {
            return false;
          }
          const entitlements = await resolveLicenseEntitlements();
          if (!entitlements.sso) {
            return false;
          }
          const workspaces = getWsStore();
          const workspace = await workspaces.getWorkspace(workspaceId);
          if (!workspace || workspace.kind !== "team") {
            return false;
          }
          const role = await workspaces.getMembership(workspaceId, user.id);
          return Boolean(role && isWorkspaceAdminRole(role));
        },
      }),
    ],
  });

  const ready = getMigrations(auth.options).then(async ({ runMigrations }) => {
    await runMigrations();
    await ensureWorkspaceSchema(pool);
    return undefined;
  });

  return {
    auth,
    pool,
    ready,
    workspaces() {
      return getWsStore();
    },
    countUsers,
    async firstUserId(): Promise<string | null> {
      try {
        const result = await pool.query<Record<string, unknown>>(
          `SELECT id FROM "user" ORDER BY "createdAt" ASC LIMIT 1`,
        );
        const id = result.rows[0]?.["id"];
        return typeof id === "string" && id.trim() ? id : null;
      } catch {
        return null;
      }
    },
    async claimFirstBootstrap(): Promise<boolean> {
      try {
        const result = await pool.query(
          `INSERT INTO brain_bootstrap_claim (id) VALUES (1) ON CONFLICT DO NOTHING RETURNING id`,
        );
        return Boolean(result.rows[0]);
      } catch {
        return false;
      }
    },
    async releaseBootstrapClaim(): Promise<void> {
      try {
        await pool.query(`DELETE FROM brain_bootstrap_claim WHERE id = 1`);
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
  return `${requireDatabaseUrl(env)}|${resolveAuthBaseURL(env)}`;
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

/** @deprecated Prefer getPool() — kept for transitional call sites. */
export function getAuthDb(env: Record<string, string | undefined> = process.env): Pool {
  return getBrainAuthBundle(env).pool;
}

export async function ensureAuthReady(
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  await getBrainAuthBundle(env).ready;
}

export async function countAuthUsers(
  env: Record<string, string | undefined> = process.env,
): Promise<number> {
  return getBrainAuthBundle(env).countUsers();
}

export async function firstAuthUserId(
  env: Record<string, string | undefined> = process.env,
): Promise<string | null> {
  return getBrainAuthBundle(env).firstUserId();
}

async function runWithSignupGate<T>(
  gate: "bootstrap" | "open" | "invite",
  fn: () => Promise<T>,
): Promise<T> {
  const previous = globalForSignupGate.brainSignupGate;
  globalForSignupGate.brainSignupGate = gate;
  try {
    return await bootstrapSignupGate.run(gate, fn);
  } finally {
    globalForSignupGate.brainSignupGate = previous;
  }
}

export async function runWithBootstrapSignup<T>(fn: () => Promise<T>): Promise<T> {
  return runWithSignupGate("bootstrap", fn);
}

export async function runWithOpenSignup<T>(fn: () => Promise<T>): Promise<T> {
  return runWithSignupGate("open", fn);
}

export async function runWithInviteSignup<T>(fn: () => Promise<T>): Promise<T> {
  return runWithSignupGate("invite", fn);
}

export function getWorkspaceStore(
  env: Record<string, string | undefined> = process.env,
): WorkspaceStore {
  return getBrainAuthBundle(env).workspaces();
}

export async function claimFirstBootstrap(
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  return getBrainAuthBundle(env).claimFirstBootstrap();
}

export async function releaseBootstrapClaim(
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  await getBrainAuthBundle(env).releaseBootstrapClaim();
}

/** Test helper: replace the in-process auth singleton. */
export function resetBrainAuthForTests(): void {
  delete globalForAuth.brainAuthBundle;
  delete globalForAuth.brainAuthBundleKey;
}
