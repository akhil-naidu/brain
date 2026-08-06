import { z } from "zod";
import { brainUserPrincipal } from "@/lib/auth/principal";
import { getStoredAccessToken } from "@/agent/lib/mcp-oauth";
import { slackProvider } from "@/agent/connections/slack";

const SLACK_API = "https://slack.com/api";
const MAX_SLACK_TEXT_CHARS = 3500;

export type SlackBriefDeliveryResult =
  | { readonly ok: true; readonly channelId: string }
  | { readonly ok: false; readonly error: string };

const slackApiResponseSchema = z
  .object({
    ok: z.boolean(),
    error: z.string().optional(),
    channel: z.string().optional(),
    channels: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
        }),
      )
      .optional(),
    response_metadata: z
      .object({
        next_cursor: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

type SlackApiResponse = z.infer<typeof slackApiResponseSchema>;

export function formatMorningBriefSlackMessage(briefText: string, title: string): string {
  const body = briefText.trim() || "_No brief text was available._";
  const clipped =
    body.length > MAX_SLACK_TEXT_CHARS ? `${body.slice(0, MAX_SLACK_TEXT_CHARS - 1)}…` : body;
  return `*${title}*\n\n${clipped}\n\n_From Brain_`;
}

export function looksLikeSlackConversationId(value: string): boolean {
  return /^[CGDU][A-Z0-9]+$/i.test(value.trim());
}

async function parseSlackResponse(response: Response): Promise<SlackApiResponse> {
  if (!response.ok) {
    throw new Error(`Slack API HTTP ${response.status}`);
  }
  const json: unknown = await response.json();
  const parsed = slackApiResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Slack API returned an unexpected response.");
  }
  return parsed.data;
}

async function slackPostJson(
  token: string,
  method: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<SlackApiResponse> {
  const response = await fetchImpl(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  return parseSlackResponse(response);
}

async function slackGet(
  token: string,
  method: string,
  params: Record<string, string>,
  fetchImpl: typeof fetch = fetch,
): Promise<SlackApiResponse> {
  const url = new URL(`${SLACK_API}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseSlackResponse(response);
}

async function findChannelIdByName(
  token: string,
  name: string,
  cursor: string,
  pagesLeft: number,
  fetchImpl: typeof fetch,
): Promise<string> {
  if (pagesLeft <= 0) {
    throw new Error(`Slack channel #${name} was not found.`);
  }

  const result = await slackGet(
    token,
    "conversations.list",
    {
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: "200",
      ...(cursor ? { cursor } : {}),
    },
    fetchImpl,
  );
  if (!result.ok) {
    throw new Error(result.error || "conversations.list failed");
  }

  const match = result.channels?.find((channel) => channel.name.toLowerCase() === name);
  if (match) {
    return match.id;
  }

  const nextCursor = result.response_metadata?.next_cursor?.trim() || "";
  if (!nextCursor) {
    throw new Error(`Slack channel #${name} was not found.`);
  }

  return findChannelIdByName(token, name, nextCursor, pagesLeft - 1, fetchImpl);
}

export async function resolveSlackChannelId(
  token: string,
  target: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const trimmed = target.trim();
  if (!trimmed) {
    throw new Error("Slack channel is empty.");
  }
  if (looksLikeSlackConversationId(trimmed)) {
    return trimmed;
  }

  const name = trimmed.replace(/^#/, "").toLowerCase();
  return findChannelIdByName(token, name, "", 20, fetchImpl);
}

export async function postMorningBriefToSlack(input: {
  readonly userId: string;
  readonly workspaceId: string;
  readonly channel: string;
  readonly title: string;
  readonly briefText: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<SlackBriefDeliveryResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const stored = await getStoredAccessToken(
      slackProvider,
      brainUserPrincipal(input.userId, input.workspaceId),
    );
    if (!stored) {
      return {
        ok: false,
        error: "Slack is not signed in. Connect Slack from the chat menu, then try again.",
      };
    }

    const channelId = await resolveSlackChannelId(stored.token, input.channel, fetchImpl);
    const text = formatMorningBriefSlackMessage(input.briefText, input.title);
    const posted = await slackPostJson(
      stored.token,
      "chat.postMessage",
      {
        channel: channelId,
        text,
        unfurl_links: false,
        unfurl_media: false,
      },
      fetchImpl,
    );

    if (!posted.ok) {
      return { ok: false, error: posted.error || "chat.postMessage failed" };
    }

    return { ok: true, channelId: posted.channel || channelId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to post morning brief to Slack.",
    };
  }
}
