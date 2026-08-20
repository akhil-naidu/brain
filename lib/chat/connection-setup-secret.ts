export function setupSecretPayload(input: {
  readonly requiresClientSecret: boolean;
  readonly optionalClientSecret?: boolean;
  readonly clientSecret: string;
}): string | undefined {
  if (!input.requiresClientSecret && input.optionalClientSecret !== true) {
    return undefined;
  }
  const trimmed = input.clientSecret.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
