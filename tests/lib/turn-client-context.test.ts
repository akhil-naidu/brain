import { describe, expect, it } from "vitest";
import { createTurnClientContext } from "@/lib/chat/turn-client-context";

describe("createTurnClientContext", () => {
  it("includes modelId, agent mode, and connection guidance", () => {
    const context = createTurnClientContext({
      modelId: "deepseek/deepseek-v4-flash",
      enabledConnections: {
        asana: true,
        atlassian: false,
        clickup: false,
        dflow: true,
        github: false,
        gmail: true,
        linear: false,
        mongodb: false,
        notion: true,
        sentry: false,
        slack: true,
        snowflake: false,
        toolbox: false,
        zernio: false,
      },
    });

    expect(context.modelId).toBe("deepseek/deepseek-v4-flash");
    expect(context.mode).toBe("agent");
    expect(context.connections).toContain("asana");
    expect(context.connections).toContain("clickup");
    expect(context.connections).toMatch(/disabled/i);
  });

  it("uses ask-mode connection guidance when mode is ask", () => {
    const context = createTurnClientContext({
      modelId: "deepseek/deepseek-v4-pro",
      mode: "ask",
      enabledConnections: {
        asana: true,
        atlassian: true,
        clickup: true,
        dflow: true,
        github: true,
        gmail: true,
        linear: true,
        mongodb: true,
        notion: true,
        sentry: true,
        slack: true,
        snowflake: true,
        toolbox: true,
        zernio: true,
      },
    });

    expect(context.mode).toBe("ask");
    expect(context.connections).toMatch(/ask mode/i);
    expect(context.connections).not.toContain("asana");
  });

  it("uses plan-mode guidance and still lists connections", () => {
    const context = createTurnClientContext({
      modelId: "deepseek/deepseek-v4-pro",
      mode: "plan",
      enabledConnections: {
        asana: true,
        atlassian: false,
        clickup: false,
        dflow: false,
        github: false,
        gmail: false,
        linear: false,
        mongodb: false,
        notion: false,
        sentry: false,
        slack: false,
        snowflake: false,
        toolbox: false,
        zernio: false,
      },
    });

    expect(context.mode).toBe("plan");
    expect(context.connections).toMatch(/plan mode/i);
    expect(context.connections).toContain("asana");
  });

  it("accepts debug mode with normal connection guidance", () => {
    const context = createTurnClientContext({
      modelId: "deepseek/deepseek-v4-pro",
      mode: "debug",
      enabledConnections: {
        asana: false,
        atlassian: false,
        clickup: false,
        dflow: false,
        github: false,
        gmail: false,
        linear: false,
        mongodb: false,
        notion: false,
        sentry: true,
        slack: false,
        snowflake: false,
        toolbox: false,
        zernio: false,
      },
    });

    expect(context.mode).toBe("debug");
    expect(context.connections).toContain("sentry");
    expect(context.connections).not.toMatch(/ask mode/i);
  });

  it("normalizes unknown model ids to the default", () => {
    const context = createTurnClientContext({
      modelId: "not-real",
      enabledConnections: {
        asana: true,
        atlassian: true,
        clickup: true,
        dflow: true,
        github: true,
        gmail: true,
        linear: true,
        mongodb: true,
        notion: true,
        sentry: true,
        slack: true,
        snowflake: true,
        toolbox: true,
        zernio: true,
      },
    });

    expect(context.modelId).toBe("deepseek/deepseek-v4-pro");
  });

  it("passes through custom model ids and workspace id", () => {
    const customId = "custom:11111111-1111-4111-8111-111111111111";
    const context = createTurnClientContext({
      modelId: customId,
      workspaceId: "ws-team",
      enabledConnections: {
        asana: false,
        atlassian: false,
        clickup: false,
        dflow: false,
        github: false,
        gmail: false,
        linear: false,
        mongodb: false,
        notion: false,
        sentry: false,
        slack: false,
        snowflake: false,
        toolbox: false,
        zernio: false,
      },
    });

    expect(context.modelId).toBe(customId);
    expect(context.workspaceId).toBe("ws-team");
  });
});
