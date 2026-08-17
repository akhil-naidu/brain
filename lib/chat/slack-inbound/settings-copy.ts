import type { ConnectionStatus } from "@/lib/chat/connections-status-api";

export type SlackAuthStatus = ConnectionStatus["status"];

export function slackInboundCardDescription(allowedChannelCount: number): string {
  const limit =
    allowedChannelCount > 0
      ? ` Limited to ${allowedChannelCount} ${allowedChannelCount === 1 ? "channel" : "channels"}.`
      : "";
  return `Talk to Brain from Slack DMs and @mentions. Uses a bot token. People still need to Connect Slack (or a matching email) so Brain knows who they are.${limit}`;
}

export function slackInboundDialogDescription(): string {
  return "Bot token and signing secret so Slack can reach Brain. Connect is separate: save the Slack app client id and secret in App settings, then each person clicks Connect so inbound runs as them.";
}

export function slackInboundEventUrlHelp(): string {
  return "In the Slack app (api.slack.com/apps → Brain): Event Subscriptions → Enable Events → Request URL, and Interactivity & Shortcuts → Request URL. Same URL for both.";
}

export function slackInboundIdentityHint(input: {
  readonly inboundReady: boolean;
  readonly slackAuthStatus: SlackAuthStatus | null;
}): string | null {
  if (!input.inboundReady) {
    return null;
  }
  if (input.slackAuthStatus === "connected") {
    return null;
  }
  if (input.slackAuthStatus === "needs_setup") {
    return "Set up Slack (client id and secret), then Connect, or DMs will not run as you.";
  }
  return "Connect Slack so DMs and @mentions run as you. If Connect fails, open App settings and use this Slack app’s client id and secret.";
}
