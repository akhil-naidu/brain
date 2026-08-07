import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { isBootstrapAllowed } from "@/lib/auth/bootstrap";
import { ensureAuthReady, getAuth, getWorkspaceStore, runWithOpenSignup } from "@/lib/auth/server";

export const runtime = "nodejs";

function requestPath(request: Request): string {
  return new URL(request.url).pathname;
}

function isScimProvisioningPath(pathname: string): boolean {
  return pathname.includes("/api/auth/scim/v2/") || pathname.endsWith("/api/auth/scim/v2");
}

async function dispatchAuth(request: Request): Promise<Response> {
  const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(getAuth());
  switch (request.method) {
    case "GET":
      return GET(request);
    case "POST":
      return POST(request);
    case "PUT":
      return PUT(request);
    case "PATCH":
      return PATCH(request);
    case "DELETE":
      return DELETE(request);
    default:
      return new Response("Method Not Allowed", { status: 405 });
  }
}

async function handler(request: Request) {
  await ensureAuthReady();
  const pathname = requestPath(request);

  if (request.method === "POST") {
    const signupMode = (await getWorkspaceStore().getPolicies()).signupMode;
    if (signupMode === "sso-only") {
      if (pathname.endsWith("/sign-up/email")) {
        return NextResponse.json(
          { error: "Email signup is disabled. Use SSO or an invite link." },
          { status: 403 },
        );
      }
      if (pathname.endsWith("/sign-in/email") && !(await isBootstrapAllowed())) {
        return NextResponse.json(
          { error: "Password sign-in is disabled. Use SSO." },
          { status: 403 },
        );
      }
    }
  }

  if (isScimProvisioningPath(pathname)) {
    // SCIM is an admin-issued directory path; allow user create under invite-only/sso-only.
    return runWithOpenSignup(() => dispatchAuth(request));
  }

  return dispatchAuth(request);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
