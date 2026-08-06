import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { MAX_PLAYBOOK_LABEL_CHARS, MAX_PLAYBOOK_PROMPT_CHARS } from "@/lib/chat/playbooks";
import { getUserDataStore } from "@/lib/chat/user-data/sqlite-user-data-store";

export const runtime = "nodejs";

const upsertSchema = z
  .object({
    id: z.string().min(1).optional(),
    label: z.string().min(1).max(MAX_PLAYBOOK_LABEL_CHARS),
    prompt: z.string().min(1).max(MAX_PLAYBOOK_PROMPT_CHARS),
  })
  .strict();

const importSchema = z
  .object({
    playbooks: z.array(
      z
        .object({
          id: z.string().min(1),
          label: z.string().min(1).max(MAX_PLAYBOOK_LABEL_CHARS),
          prompt: z.string().min(1).max(MAX_PLAYBOOK_PROMPT_CHARS),
          updatedAt: z.number().finite(),
        })
        .strict(),
    ),
  })
  .strict();

export async function GET() {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }
  const playbooks = getUserDataStore().listPlaybooks(auth.session.workspaceId);
  return NextResponse.json({ playbooks });
}

export async function POST(request: Request) {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body === "object" && body !== null && "playbooks" in body) {
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid playbooks import body" }, { status: 400 });
    }
    const playbooks = getUserDataStore().importPlaybooks(
      auth.session.workspaceId,
      auth.session.userId,
      parsed.data.playbooks,
    );
    return NextResponse.json({ playbooks }, { status: 201 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid playbook body" }, { status: 400 });
  }

  try {
    const playbook = getUserDataStore().upsertPlaybook(
      auth.session.workspaceId,
      auth.session.userId,
      parsed.data,
    );
    return NextResponse.json({ playbook }, { status: parsed.data.id ? 200 : 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save playbook." },
      { status: 400 },
    );
  }
}
