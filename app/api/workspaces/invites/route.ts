import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isSmtpConfigured, sendInviteEmail } from "@/lib/auth/email/smtp";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { ensureAuthReady, getAuth, getWorkspaceStore } from "@/lib/auth/server";
import { isWorkspaceAdminRole } from "@/lib/auth/workspaces/types";
import { resolvePublicOrigin } from "@/lib/http/public-origin";

export const runtime = "nodejs";

const createBodySchema = z
  .object({
    email: z.string().email().optional(),
    role: z.enum(["admin", "member"]).optional(),
  })
  .strict();

export async function GET() {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  if (!isWorkspaceAdminRole(session.session.role)) {
    return NextResponse.json({ error: "Only workspace admins can list invites." }, { status: 403 });
  }
  await ensureAuthReady();
  const invites = await getWorkspaceStore().listInvites(session.session.workspaceId);
  return NextResponse.json({ invites, smtpConfigured: isSmtpConfigured() });
}

export async function POST(request: Request) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  await ensureAuthReady();
  try {
    const invite = await getWorkspaceStore().createInvite({
      workspaceId: session.session.workspaceId,
      createdByUserId: session.session.userId,
      email: parsed.data.email,
      role: parsed.data.role,
    });

    let emailSent = false;
    let emailSkipReason: string | null = null;
    const boundEmail = invite.email?.trim();
    if (boundEmail) {
      if (!isSmtpConfigured()) {
        emailSkipReason = "smtp-not-configured";
      } else {
        const origin = resolvePublicOrigin(request);
        const inviteLink = new URL(`/invite/${invite.token}`, origin).toString();
        const workspaceName = session.session.workspace.name;
        let inviterLabel: string | null = null;
        try {
          const authSession = await getAuth().api.getSession({
            headers: await headers(),
          });
          inviterLabel =
            authSession?.user?.name?.trim() || authSession?.user?.email?.trim() || null;
        } catch {
          inviterLabel = null;
        }
        const sent = await sendInviteEmail({
          to: boundEmail,
          inviteUrl: inviteLink,
          workspaceName,
          inviterLabel,
        });
        if (sent.ok) {
          emailSent = true;
        } else {
          emailSkipReason = sent.reason;
        }
      }
    }

    return NextResponse.json(
      {
        invite,
        emailSent,
        emailSkipReason,
        smtpConfigured: isSmtpConfigured(),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invite.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
