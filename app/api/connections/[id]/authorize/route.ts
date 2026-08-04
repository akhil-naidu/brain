import { NextResponse } from "next/server";
import {
  menuConnectionCallbackUrl,
  startMenuConnectionAuthorization,
} from "@/agent/lib/connection-authorize";
import { getChatConnectionProvider } from "@/agent/lib/connection-status";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const provider = getChatConnectionProvider(id);
  if (!provider) {
    return NextResponse.json({ error: "Unknown connection." }, { status: 404 });
  }

  const callbackUrl = menuConnectionCallbackUrl(new URL(request.url).origin, id);
  try {
    const result = await startMenuConnectionAuthorization(provider, callbackUrl);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start sign-in.";
    const needsSetup = message.startsWith("Set ");
    return NextResponse.json({ error: message }, { status: needsSetup ? 400 : 500 });
  }
}
