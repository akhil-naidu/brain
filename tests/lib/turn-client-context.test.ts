import { describe, expect, it } from "vitest";
import { createTurnClientContext } from "@/lib/chat/turn-client-context";

describe("createTurnClientContext", () => {
  it("includes modelId and connection guidance", () => {
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
    expect(context.connections).toContain("asana");
    expect(context.connections).toContain("clickup");
    expect(context.connections).toMatch(/disabled/i);
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
});
