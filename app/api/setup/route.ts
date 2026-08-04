import { NextResponse } from "next/server";
import { isCommandCodeApiKeyConfigured } from "@/lib/chat/provider-setup";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    commandCodeApiKeyConfigured: isCommandCodeApiKeyConfigured(),
  });
}
