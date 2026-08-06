import {
  ensureAuthReady,
  getAuth,
  getWorkspaceStore,
  runWithInviteSignup,
} from "@/lib/auth/server";

export type InviteRegisteredUser = {
  readonly id: string;
  readonly email: string;
  readonly workspaceId: string;
  readonly workspaceName: string;
};

export async function registerWithInvite(input: {
  readonly token: string;
  readonly email: string;
  readonly password: string;
}): Promise<InviteRegisteredUser> {
  await ensureAuthReady();
  const workspaces = getWorkspaceStore();
  const invite = workspaces.getInviteByToken(input.token);
  if (!invite || invite.revokedAt) {
    throw new Error("Invite is invalid or revoked.");
  }
  if (Date.parse(invite.expiresAt) < Date.now()) {
    throw new Error("Invite has expired.");
  }

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required.");
  }
  if (invite.email && invite.email !== email) {
    throw new Error("Invite email does not match this account.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const result = await runWithInviteSignup(() =>
    getAuth().api.signUpEmail({
      body: {
        email,
        password: input.password,
        name: email,
      },
    }),
  );

  const userId = result.user.id;
  const workspace = workspaces.acceptInvite(input.token, userId, email);
  workspaces.setActiveWorkspaceId(userId, workspace.id);

  return {
    id: userId,
    email: result.user.email,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  };
}
