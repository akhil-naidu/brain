import { resolveSnowflakeCredentials } from "@/agent/lib/snowflake-credentials";
import { verifySnowflakeProxyToken } from "@/agent/lib/snowflake-proxy-token";

export const runtime = "nodejs";

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

async function proxySnowflakeMcp(request: Request): Promise<Response> {
  const bearer = extractBearer(request.headers.get("authorization"));
  if (!bearer) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const verified = verifySnowflakeProxyToken(bearer);
  if (!verified) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const credentials = await resolveSnowflakeCredentials(verified.workspaceId);
  if (!credentials) {
    return Response.json({ error: "Snowflake is not configured." }, { status: 503 });
  }

  const headers = forwardRequestHeaders(request);
  headers.set("authorization", `Bearer ${credentials.patToken}`);

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
    const message = error instanceof Error ? error.message : "Upstream Snowflake MCP failed.";
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

export async function GET(request: Request) {
  return proxySnowflakeMcp(request);
}

export async function POST(request: Request) {
  return proxySnowflakeMcp(request);
}

export async function DELETE(request: Request) {
  return proxySnowflakeMcp(request);
}
