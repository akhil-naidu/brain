import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export type SmtpConfig = {
  readonly from: string;
  readonly url?: string;
  readonly host?: string;
  readonly port?: number;
  readonly secure?: boolean;
  readonly user?: string;
  readonly pass?: string;
};

export function resolveSmtpConfig(
  env: Record<string, string | undefined> = process.env,
): SmtpConfig | null {
  const from = env["BRAIN_EMAIL_FROM"]?.trim();
  if (!from) {
    return null;
  }
  const url = env["BRAIN_SMTP_URL"]?.trim();
  if (url) {
    return { from, url };
  }
  const host = env["BRAIN_SMTP_HOST"]?.trim();
  if (!host) {
    return null;
  }
  const portRaw = env["BRAIN_SMTP_PORT"]?.trim();
  const port = portRaw ? Number(portRaw) : 587;
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }
  const secure =
    env["BRAIN_SMTP_SECURE"]?.trim() === "1" ||
    env["BRAIN_SMTP_SECURE"]?.trim()?.toLowerCase() === "true" ||
    port === 465;
  return {
    from,
    host,
    port,
    secure,
    user: env["BRAIN_SMTP_USER"]?.trim() || undefined,
    pass: env["BRAIN_SMTP_PASS"]?.trim() || undefined,
  };
}

export function isSmtpConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return resolveSmtpConfig(env) !== null;
}

export type SendMailResult = {
  readonly messageId?: string;
};

export type MailTransport = {
  sendMail: (options: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<SendMailResult>;
};

function createTransport(config: SmtpConfig): MailTransport {
  if (config.url) {
    return nodemailer.createTransport(config.url);
  }
  const options: SMTPTransport.Options = {
    host: config.host,
    port: config.port,
    secure: config.secure,
  };
  if (config.user && config.pass) {
    options.auth = { user: config.user, pass: config.pass };
  }
  return nodemailer.createTransport(options);
}

async function sendConfiguredMail(
  input: {
    readonly to: string;
    readonly subject: string;
    readonly text: string;
    readonly html: string;
  },
  env: Record<string, string | undefined>,
  transportFactory: (config: SmtpConfig) => MailTransport,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }> {
  const config = resolveSmtpConfig(env);
  if (!config) {
    return { ok: false, reason: "smtp-not-configured" };
  }
  try {
    const transport = transportFactory(config);
    await transport.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    return { ok: false, reason: message };
  }
}

export async function sendInviteEmail(
  input: {
    readonly to: string;
    readonly inviteUrl: string;
    readonly workspaceName: string;
    readonly inviterLabel?: string | null;
  },
  env: Record<string, string | undefined> = process.env,
  transportFactory: (config: SmtpConfig) => MailTransport = createTransport,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }> {
  const subject = `You're invited to ${input.workspaceName} on Brain`;
  const who = input.inviterLabel?.trim() || "A workspace admin";
  const text = [
    `${who} invited you to join the workspace "${input.workspaceName}" on Brain.`,
    "",
    `Open this link to accept:`,
    input.inviteUrl,
    "",
    "If you did not expect this email, you can ignore it.",
  ].join("\n");
  const html = `<p>${escapeHtml(who)} invited you to join the workspace <strong>${escapeHtml(input.workspaceName)}</strong> on Brain.</p><p><a href="${escapeHtml(input.inviteUrl)}">Accept invite</a></p><p>If you did not expect this email, you can ignore it.</p>`;

  return sendConfiguredMail({ to: input.to, subject, text, html }, env, transportFactory);
}

export async function sendPasswordResetEmail(
  input: {
    readonly to: string;
    readonly resetUrl: string;
  },
  env: Record<string, string | undefined> = process.env,
  transportFactory: (config: SmtpConfig) => MailTransport = createTransport,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }> {
  const subject = "Reset your Brain password";
  const text = [
    "Reset your Brain password using this link:",
    "",
    input.resetUrl,
    "",
    "If you did not request a password reset, you can ignore this email.",
  ].join("\n");
  const html = `<p>Reset your Brain password:</p><p><a href="${escapeHtml(input.resetUrl)}">Reset password</a></p><p>If you did not request a password reset, you can ignore this email.</p>`;

  return sendConfiguredMail({ to: input.to, subject, text, html }, env, transportFactory);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
