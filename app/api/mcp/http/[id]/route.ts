import { resolveHttpMcpCredentials } from "@/agent/lib/http-mcp-credentials";
import { verifyHttpMcpProxyToken } from "@/agent/lib/http-mcp-proxy-token";
import { isHttpMcpUrlConnectionId } from "@/agent/lib/http-mcp-url";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function extractBearer(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function forwardRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase()) || key.toLowerCase() === "authorization") {
      return;
    }
    headers.set(key, value);
  });
  return headers;
}

async function proxyHttpMcp(request: Request, connectionId: string): Promise<Response> {
  if (!isHttpMcpUrlConnectionId(connectionId)) {
    return Response.json({ error: "Unknown connection." }, { status: 404 });
  }

  const bearer = extractBearer(request.headers.get("authorization"));
  if (!bearer) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const verified = verifyHttpMcpProxyToken(bearer);
  if (!verified || verified.connectionId !== connectionId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const credentials = await resolveHttpMcpCredentials(connectionId, verified.workspaceId);
  if (!credentials) {
    return Response.json({ error: "MCP connection is not configured." }, { status: 503 });
  }

  const headers = forwardRequestHeaders(request);
  if (credentials.bearerToken) {
    headers.set("authorization", `Bearer ${credentials.bearerToken}`);
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(credentials.mcpServerUrl, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream MCP request failed.";
    return Response.json({ error: message }, { status: 502 });
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) {
      return;
    }
    responseHeaders.set(key, value);
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyHttpMcp(request, id);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyHttpMcp(request, id);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyHttpMcp(request, id);
}
