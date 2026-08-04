import { NextResponse } from "next/server";
import { disconnectMenuConnection } from "@/agent/lib/connection-authorize";
import { getChatConnectionProvider } from "@/agent/lib/connection-status";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const provider = getChatConnectionProvider(id);
  if (!provider) {
    return NextResponse.json({ error: "Unknown connection." }, { status: 404 });
  }

  const result = await disconnectMenuConnection(provider);
  return NextResponse.json({ ok: true, displayName: result.displayName });
}
