import { describe, expect, it } from "vitest";
import {
  isSmtpConfigured,
  resolveSmtpConfig,
  sendInviteEmail,
  type SmtpConfig,
} from "@/lib/auth/email/smtp";

describe("smtp config", () => {
  it("requires from plus url or host", () => {
    expect(resolveSmtpConfig({})).toBeNull();
    expect(resolveSmtpConfig({ BRAIN_EMAIL_FROM: "Brain <a@b.com>" })).toBeNull();
    expect(
      resolveSmtpConfig({
        BRAIN_EMAIL_FROM: "Brain <a@b.com>",
        BRAIN_SMTP_URL: "smtp://localhost:1025",
      }),
    ).toEqual({
      from: "Brain <a@b.com>",
      url: "smtp://localhost:1025",
    });
    expect(
      isSmtpConfigured({
        BRAIN_EMAIL_FROM: "a@b.com",
        BRAIN_SMTP_HOST: "smtp.example.com",
        BRAIN_SMTP_PORT: "587",
      }),
    ).toBe(true);
  });
});

describe("sendInviteEmail", () => {
  it("skips when smtp is not configured", async () => {
    await expect(
      sendInviteEmail(
        {
          to: "user@example.com",
          inviteUrl: "http://localhost:3000/invite/abc",
          workspaceName: "Acme",
        },
        {},
      ),
    ).resolves.toEqual({ ok: false, reason: "smtp-not-configured" });
  });

  it("sends through the transport factory", async () => {
    let capturedTo: string | null = null;
    let capturedFrom: string | null = null;
    let capturedSubject: string | null = null;
    const result = await sendInviteEmail(
      {
        to: "user@example.com",
        inviteUrl: "http://localhost:3000/invite/abc",
        workspaceName: "Acme",
        inviterLabel: "Ops",
      },
      {
        BRAIN_EMAIL_FROM: "Brain <brain@example.com>",
        BRAIN_SMTP_URL: "smtp://localhost:1025",
      },
      (_config: SmtpConfig) => ({
        sendMail: async (options) => {
          capturedTo = options.to;
          capturedFrom = options.from;
          capturedSubject = options.subject;
          return { messageId: "1" };
        },
      }),
    );
    expect(result).toEqual({ ok: true });
    expect(capturedTo).toBe("user@example.com");
    expect(capturedFrom).toBe("Brain <brain@example.com>");
    expect(capturedSubject).toContain("Acme");
  });
});
