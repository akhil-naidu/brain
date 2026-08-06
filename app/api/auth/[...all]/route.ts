import { toNextJsHandler } from "better-auth/next-js";
import { ensureAuthReady, getAuth } from "@/lib/auth/server";

export const runtime = "nodejs";

async function handler(request: Request) {
  await ensureAuthReady();
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
