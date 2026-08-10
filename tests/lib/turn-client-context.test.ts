import { describe, expect, it } from "vitest";
import { createTurnClientContext } from "@/lib/chat/turn-client-context";

describe("createTurnClientContext", () => {
  it("includes modelId and connection guidance", () => {
    const context = createTurnClientContext({
      modelId: "deepseek/deepseek-v4-flash",
      enabledConnections: {
        asana: true,
        clickup: false,
        dflow: true,
        github: false,
        gmail: true,
        slack: true,
        snowflake: false,
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
        clickup: true,
        dflow: true,
        github: true,
        gmail: true,
        slack: true,
        snowflake: true,
      },
    });

    expect(context.modelId).toBe("deepseek/deepseek-v4-pro");
  });
});
