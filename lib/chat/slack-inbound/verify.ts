import { createHmac, timingSafeEqual } from "node:crypto";
import { asStringKeyedRecord } from "@/lib/chat/slack-inbound/json-object";
import { getSlackInboundStore, resolveSlackInboundUser } from "@/lib/chat/slack-inbound/store";
import { getPool } from "@/lib/db/pool";

const MAX_SKEW_SECONDS = 60 * 5;
const HITL_ACTION_PREFIX = "eve_input:";

export class SlackInboundVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlackInboundVerificationError";
  }
}

function headerValue(request: Request, name: string): string {
  return request.headers.get(name)?.trim() ?? "";
}

export function assertValidSlackSignature(
  request: Request,
  body: string,
  signingSecret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): void {
  const timestamp = headerValue(request, "x-slack-request-timestamp");
  const signature = headerValue(request, "x-slack-signature");
  if (!timestamp || !signature) {
    throw new SlackInboundVerificationError("Missing Slack signature headers.");
  }
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || timestampNumber <= 0) {
    throw new SlackInboundVerificationError("Malformed Slack timestamp.");
  }
  if (Math.abs(nowSeconds - timestampNumber) > MAX_SKEW_SECONDS) {
    throw new SlackInboundVerificationError("Slack timestamp outside allowed skew.");
  }

  const digest = createHmac("sha256", signingSecret)
    .update(`v0:${timestamp}:${body}`, "utf8")
    .digest("hex");
  const expected = Buffer.from(`v0=${digest}`, "utf8");
  const actual = Buffer.from(signature, "utf8");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new SlackInboundVerificationError("Slack signature mismatch.");
  }
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return asStringKeyedRecord(parsed);
  } catch {
    return null;
  }
}

export function parseSlackWebhookPayload(body: string): Record<string, unknown> | null {
  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("{")) {
    return parseJsonObject(trimmed);
  }
  const params = new URLSearchParams(trimmed);
  const payload = params.get("payload");
  return payload ? parseJsonObject(payload) : null;
}

function stringField(record: Record<string, unknown> | undefined, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nestedRecord(
  record: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | undefined {
  return asStringKeyedRecord(record?.[key]) ?? undefined;
}

export function extractHitlClicker(payload: Record<string, unknown>): {
  readonly slackUserId: string;
  readonly slackTeamId: string;
  readonly slackChannelId: string;
  readonly slackThreadTs: string;
} | null {
  if (payload["type"] !== "block_actions") {
    return null;
  }
  const actions = payload["actions"];
  if (!Array.isArray(actions)) {
    return null;
  }
  const isHitl = actions.some((action) => {
    const record = asStringKeyedRecord(action);
    const actionId = record?.["action_id"];
    return typeof actionId === "string" && actionId.startsWith(HITL_ACTION_PREFIX);
  });
  if (!isHitl) {
    return null;
  }

  const slackUserId = stringField(nestedRecord(payload, "user"), "id");
  const slackTeamId = stringField(nestedRecord(payload, "team"), "id");
  const slackChannelId = stringField(nestedRecord(payload, "channel"), "id");
  const message = nestedRecord(payload, "message");
  const slackThreadTs =
    stringField(message, "thread_ts") ??
    stringField(message, "ts") ??
    stringField(payload, "message_ts");
  if (!slackUserId || !slackTeamId || !slackChannelId || !slackThreadTs) {
    return null;
  }
  return { slackUserId, slackTeamId, slackChannelId, slackThreadTs };
}

export async function assertHitlClickerIsSessionOwner(
  payload: Record<string, unknown>,
): Promise<void> {
  const clicker = extractHitlClicker(payload);
  if (!clicker) {
    return;
  }

  const pool = getPool();
  const store = getSlackInboundStore();
  const thread = await store.getThreadChat(
    clicker.slackTeamId,
    clicker.slackChannelId,
    clicker.slackThreadTs,
  );
  if (!thread) {
    throw new SlackInboundVerificationError("HITL clicker is not the session owner.");
  }

  const mapped = await resolveSlackInboundUser(pool, {
    slackTeamId: clicker.slackTeamId,
    slackUserId: clicker.slackUserId,
  });
  if (!mapped || mapped.userId !== thread.userId) {
    throw new SlackInboundVerificationError("HITL clicker is not the session owner.");
  }
}

export async function verifyBrainSlackWebhook(request: Request, body: string): Promise<void> {
  const { resolveSlackInboundCredentials } = await import("@/agent/lib/slack-inbound-credentials");
  const credentials = await resolveSlackInboundCredentials();
  if (!credentials) {
    throw new SlackInboundVerificationError("Slack inbound is not configured.");
  }
  assertValidSlackSignature(request, body, credentials.signingSecret);
  const payload = parseSlackWebhookPayload(body);
  if (payload) {
    await assertHitlClickerIsSessionOwner(payload);
  }
}
