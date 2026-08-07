import { timingSafeEqual } from "node:crypto";
import { displayNameErrorMessage, parseDisplayName } from "@/lib/auth/display-name";
import { LEGACY_CHAT_OWNER_ID } from "@/lib/auth/principal";
import {
  claimFirstBootstrap,
  countAuthUsers,
  ensureAuthReady,
  getAuth,
  getWorkspaceStore,
  releaseBootstrapClaim,
  runWithBootstrapSignup,
} from "@/lib/auth/server";
import { getChatStore } from "@/lib/chat/store";

function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

/** Serialize bootstrap attempts in this process (pairs with DB claim). */
let bootstrapChain: Promise<unknown> = Promise.resolve();

export async function isBootstrapAllowed(
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  return (await countAuthUsers(env)) === 0;
}

export function verifyBootstrapToken(
  provided: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const expected = env["BRAIN_BOOTSTRAP_TOKEN"]?.trim();
  if (!expected) {
    // Local-only convenience: allow bootstrap without a token when unset and no users exist.
    return env["NODE_ENV"] !== "production";
  }
  if (!provided) {
    return false;
  }
  return secretsEqual(provided.trim(), expected);
}

export type BootstrappedUser = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
};

async function bootstrapFirstUserUnlocked(input: {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}): Promise<BootstrappedUser> {
  await ensureAuthReady();
  if (!(await isBootstrapAllowed())) {
    throw new Error("Bootstrap is only available when no users exist.");
  }

  const name = parseDisplayName(input.name);
  if (!name) {
    throw new Error(displayNameErrorMessage());
  }
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!(await claimFirstBootstrap())) {
    throw new Error("Bootstrap is only available when no users exist.");
  }

  try {
    const result = await runWithBootstrapSignup(() =>
      getAuth().api.signUpEmail({
        body: {
          email,
          password: input.password,
          name,
        },
      }),
    );

    const userId = result.user.id;
    const workspaces = getWorkspaceStore();
    await workspaces.addInstanceAdmin(userId);
    const personal = await workspaces.ensurePersonalWorkspace(userId);
    await workspaces.setActiveWorkspaceId(userId, personal.id);

    // Best-effort: migrate any legacy chats to the new owner/workspace.
    try {
      await getChatStore().reassignOwner(LEGACY_CHAT_OWNER_ID, userId);
      await getChatStore().assignWorkspaceToUserChats(userId, personal.id);
    } catch {
      // Existing chats stay under LEGACY_CHAT_OWNER_ID until process restart.
    }

    return {
      id: userId,
      email: result.user.email,
      name,
    };
  } catch (error) {
    await releaseBootstrapClaim();
    throw error;
  }
}

export async function bootstrapFirstUser(input: {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}): Promise<BootstrappedUser> {
  const run = bootstrapChain.then(
    () => bootstrapFirstUserUnlocked(input),
    () => bootstrapFirstUserUnlocked(input),
  );
  bootstrapChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
