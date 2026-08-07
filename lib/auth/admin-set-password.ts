import type { getAuth } from "@/lib/auth/server";

const MIN_PASSWORD_LENGTH = 8;

type BrainAuth = ReturnType<typeof getAuth>;

export type AdminSetPasswordResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: string };

/**
 * Instance-admin password set/reset for a user. Creates a credential account when
 * the user only has SSO, then revokes all of that user's sessions.
 */
export async function adminSetUserPassword(
  auth: BrainAuth,
  input: {
    readonly userId: string;
    readonly newPassword: string;
  },
): Promise<AdminSetPasswordResult> {
  const password = input.newPassword;
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.findUserById(input.userId);
  if (!user) {
    return { ok: false, reason: "User not found." };
  }

  const hashed = await ctx.password.hash(password);
  const accounts = await ctx.internalAdapter.findAccounts(input.userId);
  const credential = accounts.find((account) => account.providerId === "credential");
  if (credential) {
    await ctx.internalAdapter.updatePassword(input.userId, hashed);
  } else {
    await ctx.internalAdapter.createAccount({
      userId: input.userId,
      providerId: "credential",
      accountId: input.userId,
      password: hashed,
    });
  }

  await ctx.internalAdapter.deleteUserSessions(input.userId);
  return { ok: true };
}
