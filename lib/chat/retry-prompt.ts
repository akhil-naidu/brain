import type { EveMessage } from "eve/react";

function userMessageText(message: EveMessage): string | null {
  if (message.role !== "user") {
    return null;
  }

  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  const trimmed = text.trim();
  return trimmed.length > 0 ? text : null;
}

/** Most recent user message that has text content. */
export function getLastUserMessage(messages: readonly EveMessage[]): EveMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }
    if (userMessageText(message) !== null) {
      return message;
    }
  }
  return null;
}

/** Most recent user prompt text that can be resent after a failure. */
export function getRetryableUserPrompt(messages: readonly EveMessage[]): string | null {
  const message = getLastUserMessage(messages);
  return message ? userMessageText(message) : null;
}

export function canOfferRetry(input: {
  readonly agentStatus: string;
  readonly hasVisibleError: boolean;
  readonly isBusy: boolean;
  readonly lastMessage: EveMessage | undefined;
  readonly missingApiKey: boolean;
  readonly retryableText: string | null;
}): boolean {
  if (
    !input.hasVisibleError ||
    input.isBusy ||
    input.missingApiKey ||
    input.retryableText === null
  ) {
    return false;
  }

  const lastFailedUser =
    input.lastMessage?.role === "user" && input.lastMessage.metadata?.status === "failed";
  const turnFailed = input.agentStatus === "error";
  return lastFailedUser || turnFailed;
}
