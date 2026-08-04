import { NextResponse } from "next/server";
import { completeMenuConnectionAuthorization } from "@/agent/lib/connection-authorize";
import { getChatConnectionProvider } from "@/agent/lib/connection-status";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function htmlPage(title: string, body: string, ok: boolean): NextResponse {
  const color = ok ? "#0f766e" : "#b91c1c";
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 2.5rem 1.25rem; background: #f8fafc; color: #0f172a; }
    main { max-width: 28rem; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; }
    h1 { font-size: 1.125rem; margin: 0 0 0.5rem; color: ${color}; }
    p { margin: 0; color: #475569; line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <h1>${safeTitle}</h1>
    <p>${safeBody}</p>
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function handleCallback(request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  const provider = getChatConnectionProvider(id);
  if (!provider) {
    return htmlPage("Unknown connection", "This connection is not supported.", false);
  }

  const params: Record<string, string> = {};
  const url = new URL(request.url);
  for (const [key, value] of url.searchParams) {
    params[key] = value;
  }

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const body = await request.text();
      for (const [key, value] of new URLSearchParams(body)) {
        params[key] = value;
      }
    }
  }

  const result = await completeMenuConnectionAuthorization(provider, params);
  if (result.ok) {
    return htmlPage(
      `${result.displayName} connected`,
      "You can close this tab and return to Brain.",
      true,
    );
  }
  return htmlPage("Sign-in failed", result.error, false);
}

export async function GET(request: Request, context: RouteContext) {
  return handleCallback(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handleCallback(request, context);
}
