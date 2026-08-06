export class ChatConcurrencyError extends Error {
  readonly code = "conflict" as const;

  constructor(message: string) {
    super(message);
    this.name = "ChatConcurrencyError";
  }
}

export const SHARED_TURN_LOCK_TTL_MS = 5 * 60 * 1000;

export function isChatConcurrencyError(error: unknown): error is ChatConcurrencyError {
  return error instanceof ChatConcurrencyError;
}
