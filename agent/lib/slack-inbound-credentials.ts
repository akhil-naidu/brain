import { chmod, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const storedSchema = z
  .object({
    botToken: z.string().min(1).optional(),
    signingSecret: z.string().min(1).optional(),
    allowedChannelIds: z.array(z.string()).optional(),
    updatedAt: z.number().finite(),
  })
  .strict();

type StoredSlackInbound = z.infer<typeof storedSchema>;

export type SlackInboundCredentials = {
  readonly botToken: string;
  readonly signingSecret: string;
  readonly source: "stored" | "env" | "mixed";
};

export type SlackInboundCredentialStatus = {
  readonly hasBotToken: boolean;
  readonly hasSigningSecret: boolean;
  readonly source: "stored" | "env" | "mixed" | null;
};

function credentialsPath(): string {
  return path.join(process.cwd(), ".eve", "slack-inbound-credentials.json");
}

async function readStored(): Promise<StoredSlackInbound | null> {
  try {
    const raw = await readFile(credentialsPath(), "utf8");
    const parsed = storedSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function persistStored(value: StoredSlackInbound): Promise<void> {
  const destination = credentialsPath();
  const directory = path.dirname(destination);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const temporary = path.join(
    directory,
    `.${path.basename(destination)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  try {
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, destination);
    await chmod(destination, 0o600);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function readSlackInboundStoredAllowlist(): Promise<readonly string[] | undefined> {
  const stored = await readStored();
  if (!stored || stored.allowedChannelIds === undefined) {
    return undefined;
  }
  return stored.allowedChannelIds;
}

export async function writeSlackInboundCredentials(input: {
  readonly botToken?: string;
  readonly signingSecret?: string;
  readonly allowedChannelIds?: readonly string[];
}): Promise<void> {
  const existing = await readStored();
  const botToken = input.botToken?.trim() || existing?.botToken;
  const signingSecret = input.signingSecret?.trim() || existing?.signingSecret;
  const allowedChannelIds =
    input.allowedChannelIds !== undefined
      ? [...input.allowedChannelIds]
      : existing?.allowedChannelIds;
  if (!botToken && !signingSecret && allowedChannelIds === undefined) {
    throw new Error("Bot token or signing secret is required.");
  }
  await persistStored({
    ...(botToken ? { botToken } : {}),
    ...(signingSecret ? { signingSecret } : {}),
    ...(allowedChannelIds !== undefined ? { allowedChannelIds } : {}),
    updatedAt: Date.now(),
  });
}

export async function deleteSlackInboundCredentials(): Promise<void> {
  const existing = await readStored();
  if (!existing || existing.allowedChannelIds === undefined) {
    await rm(credentialsPath(), { force: true });
    return;
  }
  await persistStored({
    allowedChannelIds: existing.allowedChannelIds,
    updatedAt: Date.now(),
  });
}

export async function resolveSlackInboundCredentials(
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<SlackInboundCredentials | null> {
  const stored = await readStored();
  const botToken = stored?.botToken?.trim() || env["SLACK_BOT_TOKEN"]?.trim() || "";
  const signingSecret = stored?.signingSecret?.trim() || env["SLACK_SIGNING_SECRET"]?.trim() || "";
  if (!botToken || !signingSecret) {
    return null;
  }
  const storedBot = Boolean(stored?.botToken?.trim());
  const storedSecret = Boolean(stored?.signingSecret?.trim());
  const envBot = Boolean(env["SLACK_BOT_TOKEN"]?.trim()) && !storedBot;
  const envSecret = Boolean(env["SLACK_SIGNING_SECRET"]?.trim()) && !storedSecret;
  const source = storedBot && storedSecret ? "stored" : envBot && envSecret ? "env" : "mixed";
  return { botToken, signingSecret, source };
}

export async function slackInboundCredentialStatus(
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<SlackInboundCredentialStatus> {
  const stored = await readStored();
  const hasStoredBot = Boolean(stored?.botToken?.trim());
  const hasStoredSecret = Boolean(stored?.signingSecret?.trim());
  const hasEnvBot = Boolean(env["SLACK_BOT_TOKEN"]?.trim());
  const hasEnvSecret = Boolean(env["SLACK_SIGNING_SECRET"]?.trim());
  const hasBotToken = hasStoredBot || hasEnvBot;
  const hasSigningSecret = hasStoredSecret || hasEnvSecret;
  if (!hasBotToken && !hasSigningSecret) {
    return { hasBotToken: false, hasSigningSecret: false, source: null };
  }
  const source =
    hasStoredBot && hasStoredSecret
      ? "stored"
      : !hasStoredBot && !hasStoredSecret
        ? "env"
        : "mixed";
  return { hasBotToken, hasSigningSecret, source };
}
