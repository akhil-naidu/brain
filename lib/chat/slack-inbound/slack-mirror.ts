export const SLACK_MIRROR_MAX_CHARS = 3500;

export type SlackMirrorRole = "user" | "assistant";

export type SlackMirrorMapping = {
  readonly channelId: string;
  readonly threadTs: string;
};

function clipSlackMirrorText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= SLACK_MIRROR_MAX_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, SLACK_MIRROR_MAX_CHARS - 1)}…`;
}

export function formatSlackMirrorText(role: SlackMirrorRole, text: string): string | null {
  const clipped = clipSlackMirrorText(text);
  if (!clipped) {
    return null;
  }
  if (role === "user") {
    return `*From Brain*\n\n${clipped}`;
  }
  return clipped;
}

export function assistantTextForSlackMirror(
  parts: readonly { readonly type: string; readonly text?: string }[],
): string {
  return parts
    .flatMap((part) => {
      if (part.type !== "text") {
        return [];
      }
      const text = part.text?.trim() ?? "";
      return text.length > 0 ? [text] : [];
    })
    .join("\n\n")
    .trim();
}

export async function postSlackThreadMirror(input: {
  readonly botToken: string | null;
  readonly mapping: SlackMirrorMapping | null;
  readonly role: SlackMirrorRole;
  readonly text: string;
  readonly post: (body: {
    readonly channel: string;
    readonly thread_ts: string;
    readonly text: string;
  }) => Promise<{ readonly ok: boolean; readonly error?: string }>;
}): Promise<
  | { readonly ok: true; readonly posted: boolean }
  | { readonly ok: false; readonly status: 400 | 404 | 502; readonly error: string }
> {
  if (!input.mapping) {
    return { ok: false, status: 404, error: "Chat is not linked to a Slack thread." };
  }
  const botToken = input.botToken?.trim() || null;
  if (!botToken) {
    return { ok: false, status: 400, error: "Slack inbound is not configured." };
  }
  const text = formatSlackMirrorText(input.role, input.text);
  if (!text) {
    return { ok: true, posted: false };
  }
  try {
    const result = await input.post({
      channel: input.mapping.channelId,
      thread_ts: input.mapping.threadTs,
      text,
    });
    if (!result.ok) {
      const error = result.error?.trim() || "Could not post to Slack.";
      return { ok: false, status: 502, error };
    }
    return { ok: true, posted: true };
  } catch {
    return { ok: false, status: 502, error: "Could not post to Slack." };
  }
}
