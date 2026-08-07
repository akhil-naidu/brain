import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMcpToolsCatalog } from "@/lib/chat/connections-tools-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchMcpToolsCatalog", () => {
  it("parses a successful catalog response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          connections: [
            {
              connectionId: "slack",
              connectionName: "Slack",
              tools: [{ name: "search_messages", description: "Search messages" }],
              error: null,
            },
          ],
        }),
      ),
    );
    await expect(fetchMcpToolsCatalog()).resolves.toEqual({
      connections: [
        {
          connectionId: "slack",
          connectionName: "Slack",
          tools: [{ name: "search_messages", description: "Search messages" }],
          error: null,
        },
      ],
    });
  });

  it("surfaces API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "Sign in required." }, { status: 401 })),
    );
    await expect(fetchMcpToolsCatalog()).rejects.toThrow("Sign in required.");
  });
});
