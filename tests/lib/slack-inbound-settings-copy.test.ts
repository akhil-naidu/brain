import { describe, expect, it } from "vitest";
import {
  slackInboundCardDescription,
  slackInboundDialogDescription,
  slackInboundEventUrlHelp,
  slackInboundIdentityHint,
} from "@/lib/chat/slack-inbound/settings-copy";

describe("slackInboundCardDescription", () => {
  it("says Connect is still required and does not say inbound replaces it", () => {
    const copy = slackInboundCardDescription(0);
    expect(copy).toContain("Connect Slack");
    expect(copy).not.toMatch(/not Slack Connect/i);
  });

  it("mentions an allowlist count when restricted", () => {
    expect(slackInboundCardDescription(1)).toContain("Limited to 1 channel.");
    expect(slackInboundCardDescription(2)).toContain("Limited to 2 channels.");
  });
});

describe("slackInboundDialogDescription", () => {
  it("separates bot token inbound from Connect setup", () => {
    const copy = slackInboundDialogDescription();
    expect(copy).toContain("Bot token");
    expect(copy).toContain("client id");
    expect(copy).toContain("Connect");
  });
});

describe("slackInboundEventUrlHelp", () => {
  it("names both Slack screens that need the Event URL", () => {
    const copy = slackInboundEventUrlHelp();
    expect(copy).toContain("Event Subscriptions");
    expect(copy).toContain("Interactivity");
  });
});

describe("slackInboundIdentityHint", () => {
  it("is silent when inbound is off or the user is Connected", () => {
    expect(
      slackInboundIdentityHint({ inboundReady: false, slackAuthStatus: "needs_sign_in" }),
    ).toBeNull();
    expect(
      slackInboundIdentityHint({ inboundReady: true, slackAuthStatus: "connected" }),
    ).toBeNull();
  });

  it("asks for Set up then Connect when inbound is on without app credentials", () => {
    expect(
      slackInboundIdentityHint({ inboundReady: true, slackAuthStatus: "needs_setup" }),
    ).toMatch(/Set up Slack/);
  });

  it("asks for Connect when inbound is on and credentials exist", () => {
    expect(
      slackInboundIdentityHint({ inboundReady: true, slackAuthStatus: "needs_sign_in" }),
    ).toMatch(/Connect Slack/);
  });
});
