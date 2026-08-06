import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { isBootstrapAllowed } from "@/lib/auth/bootstrap";
import { ensureAuthReady, getAuth, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

function requestPath(request: Request): string {
  return new URL(request.url).pathname;
}

async function handler(request: Request) {
  await ensureAuthReady();
  const pathname = requestPath(request);

  if (request.method === "POST") {
    const signupMode = getWorkspaceStore().getPolicies().signupMode;
    if (signupMode === "sso-only") {
      if (pathname.endsWith("/sign-up/email")) {
        return NextResponse.json(
          { error: "Email signup is disabled. Use SSO or an invite link." },
          { status: 403 },
        );
      }
      if (pathname.endsWith("/sign-in/email") && !isBootstrapAllowed()) {
        return NextResponse.json(
          { error: "Password sign-in is disabled. Use SSO." },
          { status: 403 },
        );
      }
    }
  }

  const { GET, POST } = toNextJsHandler(getAuth());
  if (request.method === "GET") {
    return GET(request);
  }
  if (request.method === "POST") {
    return POST(request);
  }
  return new Response("Method Not Allowed", { status: 405 });
}

export const GET = handler;
export const POST = handler;
