import { NextResponse } from "next/server";
import { listChatConnectionStatuses } from "@/agent/lib/connection-status";

export const runtime = "nodejs";

export async function GET() {
  const connections = await listChatConnectionStatuses();
  return NextResponse.json({ connections });
}
